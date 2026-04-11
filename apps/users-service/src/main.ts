import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: {
      host: process.env.USERS_SERVICE_HOST?.trim() || '0.0.0.0',
      port: Number(process.env.USERS_SERVICE_PORT ?? 4002),
    },
  });

  await app.listen();
}

bootstrap();
