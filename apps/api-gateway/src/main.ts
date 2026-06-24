import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureHttpCors, configureRootSwaggerRedirect } from './bootstrap-http';
import { ChatRealtimeService } from './modules/realtime/chat-realtime.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

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

  const port = configService.get<number>('PORT') ?? 3001;
  await app.listen(port);
  await app.get(ChatRealtimeService).bind(app.getHttpServer());
}

bootstrap();
