import { z } from 'zod';
import { readFileSync } from 'fs';

/**
 * Reads a Docker secret from /run/secrets/<name>.
 * Returns undefined if the file does not exist.
 */
function readSecret(name: string): string | undefined {
  try {
    return readFileSync(`/run/secrets/${name}`, 'utf-8').trim();
  } catch {
    return undefined;
  }
}

function loadSecretsIntoEnv(): void {
  const secretMappings: Record<string, string> = {
    build_callback_secret: 'BUILD_CALLBACK_SECRET',
    github_app_private_key: 'GITHUB_APP_PRIVATE_KEY',
    s3_secret_key: 'S3_SECRET_KEY',
  };

  for (const [secretName, envVar] of Object.entries(secretMappings)) {
    const value = readSecret(secretName);
    if (value) {
      process.env[envVar] = value;
    }
  }
}

// Load Docker secrets before parsing env
loadSecretsIntoEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BUILDER_PORT: z.coerce.number().default(3002),
  BUILDER_HOST: z.string().default('0.0.0.0'),

  BUILD_CALLBACK_URL: z.string().default('http://localhost:3001/api/internal/build-callback'),
  BUILD_CALLBACK_SECRET: z.string().min(1),

  DOCKER_SOCKET: z.string().default('/var/run/docker.sock'),

  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin'),
  S3_BUCKET: z.string().default('addon-artifacts'),
  S3_REGION: z.string().default('us-east-1'),

  REGISTRY_URL: z.string().optional(),

  MAX_CONCURRENT_BUILDS: z.coerce.number().default(3),
  BUILD_TIMEOUT_MS: z.coerce.number().default(600000),

  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_APP_INSTALLATION_ID: z.coerce.number().optional(),
});

export type BuilderConfig = z.infer<typeof envSchema>;

let config: BuilderConfig | null = null;

export function loadConfig(): BuilderConfig {
  if (config) return config;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid builder configuration:');
    console.error(result.error.format());
    process.exit(1);
  }

  config = result.data;
  return config;
}

export function getConfig(): BuilderConfig {
  if (!config) {
    return loadConfig();
  }
  return config;
}
