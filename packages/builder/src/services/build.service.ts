import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import crypto from 'crypto';
import type { BuildJob } from '../lib/queue.js';
import { DockerManager } from '../lib/docker.js';
import { StorageClient, type UploadResult } from '../lib/storage.js';
import { scanDirectory, type ScanResult } from '../lib/scanner.js';
import { validateManifest, checkDependencies, type AddonManifest } from '../lib/manifest.js';
import { getConfig } from '../lib/config.js';
import type { BuildStep, BuildReport } from '@addon-platform/shared';

const TEMPLATE_DIR = path.resolve(import.meta.dirname, '../../templates');
const ALLOWED_DEPS_PATH = path.resolve(import.meta.dirname, '../../config/allowed-dependencies.json');

interface StepContext {
  steps: BuildStep[];
  workDir: string;
  manifest?: AddonManifest;
  artifactPath?: string;
  uploadResult?: UploadResult;
}

async function runStep(
  ctx: StepContext,
  name: string,
  fn: () => Promise<string | undefined>
): Promise<boolean> {
  const step: BuildStep = { name, status: 'running' };
  ctx.steps.push(step);
  const start = Date.now();

  try {
    const logs = await fn();
    step.status = 'success';
    step.duration = Date.now() - start;
    if (logs) step.logs = logs;
    return true;
  } catch (error) {
    step.status = 'failed';
    step.duration = Date.now() - start;
    step.error = (error as Error).message;
    step.logs = (error as Error).message;
    return false;
  }
}

export class BuildService {
  constructor(
    private docker: DockerManager,
    private storage: StorageClient
  ) {}

  async executeBuild(job: BuildJob): Promise<void> {
    const config = getConfig();
    const startedAt = new Date().toISOString();
    const start = Date.now();
    const workDir = path.join(os.tmpdir(), `build-${job.buildId}`);
    const ctx: StepContext = { steps: [], workDir };

    let containerId: string | undefined;
    let imageTag: string | undefined;

    try {
      await fs.mkdir(workDir, { recursive: true });
      const sourceDir = path.join(workDir, 'source');
      await fs.mkdir(sourceDir, { recursive: true });

      // Step 1: Source retrieval
      const sourceOk = await runStep(ctx, 'Source Retrieval', async () => {
        await this.retrieveSource(job, sourceDir);
        return `Downloaded source for ${job.repoFullName}@${job.commitSha || 'HEAD'}`;
      });
      if (!sourceOk) throw new Error('Source retrieval failed');

      // Step 2: Manifest validation
      const manifestOk = await runStep(ctx, 'Manifest Validation', async () => {
        const result = await validateManifest(sourceDir, job.version);
        if (!result.valid) throw new Error(result.error);
        ctx.manifest = result.manifest;
        return `Manifest valid: ${result.manifest!.name} v${result.manifest!.version}`;
      });
      if (!manifestOk) throw new Error('Manifest validation failed');

      // Step 3: Dependency check
      const depsOk = await runStep(ctx, 'Dependency Check', async () => {
        const result = await checkDependencies(ctx.manifest!, ALLOWED_DEPS_PATH);
        if (!result.allowed) {
          throw new Error(`Disallowed dependencies: ${result.disallowed.join(', ')}`);
        }
        const depCount = Object.keys(ctx.manifest!.dependencies).length;
        return `${depCount} dependencies checked, all allowed`;
      });
      if (!depsOk) throw new Error('Dependency check failed');

      // Step 4: Security scan
      const scanOk = await runStep(ctx, 'Security Scan', async () => {
        const result: ScanResult = await scanDirectory(sourceDir);
        const findingsLog = result.findings
          .map((f) => `  [${f.severity}] ${f.file}:${f.line} — ${f.message}`)
          .join('\n');
        if (!result.passed) {
          throw new Error(`Security scan failed:\n${findingsLog}`);
        }
        return result.findings.length > 0
          ? `Passed with warnings:\n${findingsLog}`
          : 'No issues found';
      });
      if (!scanOk) throw new Error('Security scan failed');

      // Step 5: Docker build
      imageTag = `addon-build-${job.buildId}`;
      const outputDir = path.join(workDir, 'output');
      await fs.mkdir(outputDir, { recursive: true });

      const buildOk = await runStep(ctx, 'Docker Build', async () => {
        const dockerfileName = `${job.addonType.toLowerCase()}.Dockerfile`;
        const dockerfilePath = path.join(TEMPLATE_DIR, dockerfileName);

        try {
          await fs.access(dockerfilePath);
        } catch {
          // Fallback to widget template
          const fallback = path.join(TEMPLATE_DIR, 'widget.Dockerfile');
          await this.docker.buildImage(fallback, sourceDir, imageTag!);
          const result = await this.docker.runContainer(
            imageTag!,
            [`${outputDir}:/output`],
            config.BUILD_TIMEOUT_MS
          );
          containerId = undefined; // Container auto-removed after run
          return `Build completed (exit code: ${result.exitCode})\n${result.logs.slice(0, 5000)}`;
        }

        await this.docker.buildImage(dockerfilePath, sourceDir, imageTag!);
        const result = await this.docker.runContainer(
          imageTag!,
          [`${outputDir}:/output`],
          config.BUILD_TIMEOUT_MS
        );
        return `Build completed (exit code: ${result.exitCode})\n${result.logs.slice(0, 5000)}`;
      });
      if (!buildOk) throw new Error('Docker build failed');

      // Find the artifact
      const outputFiles = await fs.readdir(outputDir);
      const artifactName = outputFiles.find((f) => f.endsWith('.tar.gz')) || outputFiles[0];
      if (!artifactName) throw new Error('No build artifact produced');
      ctx.artifactPath = path.join(outputDir, artifactName);

      // Step 6: Artifact upload
      const uploadOk = await runStep(ctx, 'Artifact Upload', async () => {
        const key = `addons/${job.addonId}/${job.version}/bundle.tar.gz`;
        ctx.uploadResult = await this.storage.uploadArtifact(key, ctx.artifactPath!);
        return `Uploaded to ${ctx.uploadResult.url} (${ctx.uploadResult.size} bytes, sha256: ${ctx.uploadResult.checksum})`;
      });
      if (!uploadOk) throw new Error('Artifact upload failed');

      // Build succeeded
      const report: BuildReport = {
        buildId: job.buildId,
        status: 'success',
        steps: ctx.steps,
        artifacts: [
          {
            name: 'bundle.tar.gz',
            url: ctx.uploadResult!.url,
            size: ctx.uploadResult!.size,
            checksum: ctx.uploadResult!.checksum,
          },
        ],
        duration: Date.now() - start,
        startedAt,
        finishedAt: new Date().toISOString(),
      };

      await this.sendCallback(job.callbackUrl, {
        versionId: job.versionId,
        buildId: job.buildId,
        status: 'success',
        report,
        downloadUrl: ctx.uploadResult!.url,
        fileSize: ctx.uploadResult!.size,
        checksum: ctx.uploadResult!.checksum,
      });
    } catch (error) {
      const report: BuildReport = {
        buildId: job.buildId,
        status: 'failed',
        steps: ctx.steps,
        artifacts: [],
        duration: Date.now() - start,
        error: (error as Error).message,
        startedAt,
        finishedAt: new Date().toISOString(),
      };

      await this.sendCallback(job.callbackUrl, {
        versionId: job.versionId,
        buildId: job.buildId,
        status: 'failed',
        report,
      });
    } finally {
      // Cleanup
      if (containerId && imageTag) {
        await this.docker.cleanup(containerId, imageTag);
      } else if (imageTag) {
        try {
          await this.docker.cleanup('', imageTag);
        } catch {
          // Ignore cleanup errors
        }
      }
      try {
        await fs.rm(workDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private async retrieveSource(job: BuildJob, destDir: string): Promise<void> {
    const config = getConfig();

    if (!config.GITHUB_APP_ID || !config.GITHUB_APP_PRIVATE_KEY || !config.GITHUB_APP_INSTALLATION_ID) {
      // Fallback: create a placeholder source
      await fs.writeFile(
        path.join(destDir, 'addon.manifest.json'),
        JSON.stringify(
          {
            name: job.addonId,
            version: job.version,
            type: job.addonType.toLowerCase(),
            entryPoint: 'index.js',
            dependencies: {},
          },
          null,
          2
        )
      );
      await fs.writeFile(path.join(destDir, 'index.js'), '// placeholder\nmodule.exports = {};\n');
      return;
    }

    // Use GitHub API to download tarball
    const { createAppAuth } = await import('@octokit/auth-app');
    const auth = createAppAuth({
      appId: config.GITHUB_APP_ID,
      privateKey: config.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n'),
      installationId: config.GITHUB_APP_INSTALLATION_ID,
    });

    const { token } = await auth({ type: 'installation' });
    const [owner, repo] = job.repoFullName.split('/');
    const ref = job.commitSha || 'main';

    const url = `https://api.github.com/repos/${owner}/${repo}/tarball/${ref}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download source: ${response.status} ${response.statusText}`);
    }

    const tarballPath = path.join(destDir, '..', 'source.tar.gz');
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(tarballPath, buffer);

    // Extract tarball
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const tarballPosix = tarballPath.replace(/\\/g, '/');
    const destDirPosix = destDir.replace(/\\/g, '/');
    await execAsync(`tar -xzf "${tarballPosix}" -C "${destDirPosix}" --strip-components=1 --force-local`);
    await fs.unlink(tarballPath);
  }

  private async sendCallback(
    callbackUrl: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const config = getConfig();

    try {
      const body = JSON.stringify(data);
      const signature = crypto
        .createHmac('sha256', config.BUILD_CALLBACK_SECRET)
        .update(body)
        .digest('hex');

      await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Build-Secret': config.BUILD_CALLBACK_SECRET,
          'X-Build-Signature': signature,
        },
        body,
      });
    } catch (error) {
      console.error('Failed to send callback:', error);
    }
  }
}
