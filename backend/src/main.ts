import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';

import { Logger } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module.js';
import { extractErrorMessage } from './modules/common/utils/error-message.js';
import { isOriginAllowed } from './modules/common/utils/origin-allowed.js';

async function bootstrap(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : ['http://localhost:3000', 'http://172.17.144.1:3000'];
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin, allowedOrigins)) return callback(null, true);
      callback(new Error('CORS: origin not allowed'));
    },
    credentials: true,
  });
  app.useWebSocketAdapter(new WsAdapter(app));
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
  return app;
}
bootstrap().catch((err: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Failed to start application: ${extractErrorMessage(err)}`);
  process.exit(1);
});
