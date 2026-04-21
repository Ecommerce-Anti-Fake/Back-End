import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.CATALOG_SERVICE_HOST?.trim() || '0.0.0.0',
      port: Number(process.env.CATALOG_SERVICE_PORT ?? 4003),
    },
  });

  await app.listen();
}

bootstrap();
