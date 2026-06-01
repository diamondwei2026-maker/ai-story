import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason instanceof Error ? reason.message : String(reason));
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: allow Vercel frontend to call this API
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Global prefix: all routes served under /api
  // Works with both Vite dev proxy (no rewrite) and direct Render access
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server listening on port ${port}`);
}
bootstrap();
