import Docker from 'dockerode';
import path from 'path';
import fs from 'fs/promises';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

export class DockerManager {
  private docker: Docker;

  constructor(socketPath: string) {
    this.docker = new Docker({ socketPath });
  }

  async ping(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  async buildImage(
    dockerfilePath: string,
    contextPath: string,
    tag: string
  ): Promise<void> {
    const dockerfileContent = await fs.readFile(dockerfilePath, 'utf-8');
    const tempDockerfile = path.join(contextPath, 'Dockerfile');
    await fs.writeFile(tempDockerfile, dockerfileContent);

    const stream = await this.docker.buildImage(
      { context: contextPath, src: ['.'] },
      { t: tag, dockerfile: 'Dockerfile' }
    );

    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(
        stream,
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async runContainer(
    image: string,
    binds: string[],
    timeout: number,
    env: string[] = []
  ): Promise<{ logs: string; exitCode: number }> {
    const container = await this.docker.createContainer({
      Image: image,
      HostConfig: {
        Binds: binds,
        Memory: 512 * 1024 * 1024,
        CpuQuota: 100000,
        NetworkMode: 'none',
      },
      Env: env,
    });

    await container.start();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Build timed out')), timeout);
    });

    const waitPromise = container.wait();
    const result = await Promise.race([waitPromise, timeoutPromise]);

    const logStream = await container.logs({ stdout: true, stderr: true });
    const logs = logStream.toString('utf-8');

    return { logs, exitCode: result.StatusCode };
  }

  async extractFiles(
    containerId: string,
    containerPath: string,
    hostPath: string
  ): Promise<void> {
    const container = this.docker.getContainer(containerId);
    const stream = await container.getArchive({ path: containerPath });
    const outputFile = path.join(hostPath, 'output.tar');
    await pipeline(stream, createWriteStream(outputFile));
  }

  async cleanup(containerId: string, imageTag?: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      try {
        await container.stop({ t: 5 });
      } catch {
        // Already stopped
      }
      await container.remove({ force: true });
    } catch {
      // Container may already be removed
    }

    if (imageTag) {
      try {
        const image = this.docker.getImage(imageTag);
        await image.remove({ force: true });
      } catch {
        // Image may already be removed
      }
    }
  }
}
