import { loadConfig } from './lib/config.js';
import { buildApp } from './app.js';

async function main() {
  const config = loadConfig();
  const app = await buildApp();

  try {
    await app.listen({
      host: config.BUILDER_HOST,
      port: config.BUILDER_PORT,
    });
    app.log.info(`Builder service running on http://${config.BUILDER_HOST}:${config.BUILDER_PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

main();
