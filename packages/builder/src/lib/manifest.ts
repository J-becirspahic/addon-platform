import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

const semverRegex = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

const manifestSchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().regex(semverRegex, 'Version must be valid semver'),
  type: z.enum(['widget', 'connector', 'theme']),
  entryPoint: z.string().min(1),
  dependencies: z.record(z.string()).default({}),
  minAppVersion: z.string().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
});

export type AddonManifest = z.infer<typeof manifestSchema>;

export async function validateManifest(
  dirPath: string,
  expectedVersion?: string
): Promise<{ valid: boolean; manifest?: AddonManifest; error?: string }> {
  const manifestPath = path.join(dirPath, 'addon.manifest.json');

  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    const parsed = JSON.parse(content);
    const result = manifestSchema.safeParse(parsed);

    if (!result.success) {
      return {
        valid: false,
        error: `Manifest validation failed: ${result.error.issues.map((i) => i.message).join(', ')}`,
      };
    }

    if (expectedVersion && result.data.version !== expectedVersion) {
      return {
        valid: false,
        error: `Manifest version "${result.data.version}" does not match expected "${expectedVersion}"`,
      };
    }

    return { valid: true, manifest: result.data };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { valid: false, error: 'addon.manifest.json not found' };
    }
    return { valid: false, error: `Failed to parse manifest: ${(error as Error).message}` };
  }
}

export async function checkDependencies(
  manifest: AddonManifest,
  allowListPath: string
): Promise<{ allowed: boolean; disallowed: string[] }> {
  try {
    const content = await fs.readFile(allowListPath, 'utf-8');
    const allowList: string[] = JSON.parse(content);
    const allowSet = new Set(allowList);

    const deps = Object.keys(manifest.dependencies);
    const disallowed = deps.filter((dep) => !allowSet.has(dep));

    return { allowed: disallowed.length === 0, disallowed };
  } catch {
    // If allow-list doesn't exist, allow all dependencies
    return { allowed: true, disallowed: [] };
  }
}
