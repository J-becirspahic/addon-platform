import { loadConfig } from './lib/config.js';
import { buildApp } from './app.js';

async function main() {
  const config = loadConfig();
  const app = await buildApp();

  try {
    await app.listen({
      port: config.API_PORT,
      host: config.API_HOST,
    });

    app.log.info({ port: config.API_PORT, host: config.API_HOST }, 'Server started');
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

main();
