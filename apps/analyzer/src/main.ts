import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for Dashboard UI connections
  app.enableCors();
  
  const portStr = process.env.PORT;
  if (!portStr) {
    throw new Error('FATAL: PORT environment variable is not defined or is empty!');
  }
  const port = parseInt(portStr, 10);
  await app.listen(port, '0.0.0.0');
  console.log(`Sentinel AI Analyzer API listening on port ${port}`);
}
bootstrap();
