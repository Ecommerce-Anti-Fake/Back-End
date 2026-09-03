import {
  INestApplication,
  INestMicroservice,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule as AffiliateServiceModule } from '../../affiliate-service/src/app.module';
import { AppModule as AuthServiceModule } from '../../auth-service/src/app.module';
import { AppModule as CatalogServiceModule } from '../../catalog-service/src/app.module';
import { AppModule as OrdersServiceModule } from '../../orders-service/src/app.module';
import { AppModule as UsersServiceModule } from '../../users-service/src/app.module';
import { AppModule as ApiGatewayModule } from './app.module';
import {
  configureHttpBodyParser,
  configureHttpCors,
  configureRootSwaggerRedirect,
} from './bootstrap-http';
import { ChatRealtimeService } from './modules/realtime/chat-realtime.service';
import {
  createIdempotentShutdown,
  describeBindError,
  EmbeddedServicePorts,
  HttpServerLike,
  listenHttpServer,
} from './passenger-runtime';
import { assertUatRuntimeDatabaseTarget } from '../../../scripts/uat/uat-safety';

const localHost = '127.0.0.1';

export type EmbeddedDeployment = {
  gateway: INestApplication;
  microservices: INestMicroservice[];
  close: () => Promise<void>;
};

export async function bootstrapEmbeddedDeployment(options: {
  httpPort: number;
  httpHost?: string;
  servicePorts: EmbeddedServicePorts;
}): Promise<EmbeddedDeployment> {
  assertUatRuntimeDatabaseTarget();
  configureLocalServiceEnvironment(options.servicePorts);
  const microservices: INestMicroservice[] = [];
  let gateway: INestApplication | undefined;

  try {
    microservices.push(
      await bootstrapMicroservice(
        'auth-service',
        AuthServiceModule,
        options.servicePorts.auth,
      ),
    );
    microservices.push(
      await bootstrapMicroservice(
        'users-service',
        UsersServiceModule,
        options.servicePorts.users,
      ),
    );
    microservices.push(
      await bootstrapMicroservice(
        'catalog-service',
        CatalogServiceModule,
        options.servicePorts.catalog,
      ),
    );
    microservices.push(
      await bootstrapMicroservice(
        'orders-service',
        OrdersServiceModule,
        options.servicePorts.orders,
      ),
    );
    microservices.push(
      await bootstrapMicroservice(
        'affiliate-service',
        AffiliateServiceModule,
        options.servicePorts.affiliate,
      ),
    );

    gateway = await createGatewayApplication();
    await listenHttpServer(
      gateway.getHttpServer() as HttpServerLike,
      options.httpPort,
      options.httpHost,
    );

    const address = options.httpHost
      ? `${options.httpHost}:${options.httpPort}`
      : `Passenger-managed socket (PORT=${options.httpPort})`;
    console.log(`[api-gateway] listening on ${address}`);

    return {
      gateway,
      microservices,
      close: createIdempotentShutdown(gateway, microservices),
    };
  } catch (error) {
    const close = createIdempotentShutdown(gateway, microservices);
    await close().catch((closeError) => {
      console.error(
        '[deploy-bootstrap] cleanup after startup failure failed',
        closeError,
      );
    });
    throw describeBindError(error);
  }
}

function configureLocalServiceEnvironment(ports: EmbeddedServicePorts) {
  process.env.AUTH_SERVICE_HOST = localHost;
  process.env.USERS_SERVICE_HOST = localHost;
  process.env.CATALOG_SERVICE_HOST = localHost;
  process.env.ORDERS_SERVICE_HOST = localHost;
  process.env.AFFILIATE_SERVICE_HOST = localHost;

  process.env.AUTH_SERVICE_PORT = String(ports.auth);
  process.env.USERS_SERVICE_PORT = String(ports.users);
  process.env.CATALOG_SERVICE_PORT = String(ports.catalog);
  process.env.ORDERS_SERVICE_PORT = String(ports.orders);
  process.env.AFFILIATE_SERVICE_PORT = String(ports.affiliate);
}

async function bootstrapMicroservice(
  name: string,
  module: Type<unknown>,
  port: number,
) {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    module,
    {
      transport: Transport.TCP,
      options: {
        host: localHost,
        port,
      },
    },
  );

  try {
    await app.listen();
  } catch (error) {
    await app.close().catch(() => undefined);
    throw describeBindError(error, `${name} on ${localHost}:${port}`);
  }

  console.log(`[${name}] listening on ${localHost}:${port}`);
  return app;
}

async function createGatewayApplication() {
  const app = await NestFactory.create(ApiGatewayModule, { bodyParser: false });
  const configService = app.get(ConfigService);

  configureHttpBodyParser(app, configService);
  app.setGlobalPrefix('api');
  configureHttpCors(app, configService);
  configureRootSwaggerRedirect(app);
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
    .addTag('Admin')
    .addTag('Address')
    .addTag('Affiliate')
    .addTag('Auth')
    .addTag('Brand')
    .addTag('Cart')
    .addTag('Category')
    .addTag('Chat')
    .addTag('Dashboard')
    .addTag('Distribution')
    .addTag('Favorite')
    .addTag('Health')
    .addTag('KYC')
    .addTag('Live')
    .addTag('Media')
    .addTag('Moderation')
    .addTag('Notification')
    .addTag('Offer')
    .addTag('Order')
    .addTag('Payment')
    .addTag('Report')
    .addTag('Review')
    .addTag('Shipping')
    .addTag('Shop')
    .addTag('Social')
    .addTag('User')
    .addTag('Verification')
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

  SwaggerModule.setup('swagger', app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.init();
  await app.get(ChatRealtimeService).bind(app.getHttpServer());
  return app;
}
