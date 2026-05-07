import { Type, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule as ApiGatewayModule } from './app.module';
import { AppModule as AffiliateServiceModule } from '../../affiliate-service/src/app.module';
import { AppModule as AuthServiceModule } from '../../auth-service/src/app.module';
import { AppModule as CatalogServiceModule } from '../../catalog-service/src/app.module';
import { AppModule as OrdersServiceModule } from '../../orders-service/src/app.module';
import { AppModule as UsersServiceModule } from '../../users-service/src/app.module';

const localHost = '127.0.0.1';

async function bootstrapMicroservice(name: string, module: Type<unknown>, port: number) {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(module, {
    transport: Transport.TCP,
    options: {
      host: localHost,
      port,
    },
  });

  await app.listen();
  console.log(`[${name}] listening on ${localHost}:${port}`);
  return app;
}

function configureLocalServiceHosts() {
  process.env.AUTH_SERVICE_HOST = localHost;
  process.env.USERS_SERVICE_HOST = localHost;
  process.env.CATALOG_SERVICE_HOST = localHost;
  process.env.ORDERS_SERVICE_HOST = localHost;
  process.env.AFFILIATE_SERVICE_HOST = localHost;

  process.env.AUTH_SERVICE_PORT ??= '4001';
  process.env.USERS_SERVICE_PORT ??= '4002';
  process.env.CATALOG_SERVICE_PORT ??= '4003';
  process.env.ORDERS_SERVICE_PORT ??= '4004';
  process.env.AFFILIATE_SERVICE_PORT ??= '4005';
}

async function bootstrapGateway() {
  const app = await NestFactory.create(ApiGatewayModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Ecommerce-Anti-Fake API Gateway')
    .setDescription('HTTP gateway for Ecommerce-Anti-Fake microservices')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste access token here to test protected endpoints.',
      },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('swagger', app, document);

  const port = configService.get<number>('PORT') ?? 10000;
  await app.listen(port, '0.0.0.0');
  console.log(`[api-gateway] listening on 0.0.0.0:${port}`);
}

async function bootstrap() {
  configureLocalServiceHosts();

  await bootstrapMicroservice('auth-service', AuthServiceModule, Number(process.env.AUTH_SERVICE_PORT));
  await bootstrapMicroservice('users-service', UsersServiceModule, Number(process.env.USERS_SERVICE_PORT));
  await bootstrapMicroservice('catalog-service', CatalogServiceModule, Number(process.env.CATALOG_SERVICE_PORT));
  await bootstrapMicroservice('orders-service', OrdersServiceModule, Number(process.env.ORDERS_SERVICE_PORT));
  await bootstrapMicroservice('affiliate-service', AffiliateServiceModule, Number(process.env.AFFILIATE_SERVICE_PORT));
  await bootstrapGateway();
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
