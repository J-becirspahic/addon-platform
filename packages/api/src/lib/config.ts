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

/**
 * For sensitive config values, Docker secrets take precedence over env vars.
 * This keeps secrets out of environment variable listings and process dumps.
 */
function loadSecretsIntoEnv(): void {
  const secretMappings: Record<string, string> = {
    jwt_access_secret: 'JWT_ACCESS_SECRET',
    jwt_refresh_secret: 'JWT_REFRESH_SECRET',
    github_app_private_key: 'GITHUB_APP_PRIVATE_KEY',
    github_app_webhook_secret: 'GITHUB_APP_WEBHOOK_SECRET',
    github_oauth_client_secret: 'GITHUB_OAUTH_CLIENT_SECRET',
    build_callback_secret: 'BUILD_CALLBACK_SECRET',
    postgres_password: 'POSTGRES_PASSWORD',
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
  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_APP_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_APP_CLIENT_ID: z.string().optional(),
  GITHUB_APP_CLIENT_SECRET: z.string().optional(),
  GITHUB_APP_INSTALLATION_ID: z.coerce.number().optional(),

  GITHUB_OAUTH_CLIENT_ID: z.string().optional(),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().optional(),
  GITHUB_OAUTH_CALLBACK_URL: z.string().optional(),

  GITHUB_ORG_NAME: z.string().optional(),
  REVIEW_TEAM_SLUG: z.string().optional(),

  BUILDER_URL: z.string().optional(),
  BUILD_CALLBACK_SECRET: z.string().optional(),

  RECONCILIATION_CRON: z.string().default('0 * * * *'),

  FRONTEND_URL: z.string().default('http://localhost:3000'),

  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
});

export type Config = z.infer<typeof envSchema>;

let config: Config | null = null;

export function loadConfig(): Config {
  if (config) return config;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }

  config = result.data;
  return config;
}

export function getConfig(): Config {
  if (!config) {
    return loadConfig();
  }
  return config;
}
