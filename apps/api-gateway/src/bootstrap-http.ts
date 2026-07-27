import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';

const DEFAULT_BODY_LIMIT = '5mb';

const DEVELOPMENT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://192.168.1.133:5173',
  'http://192.168.1.161:5173',
];

const PRODUCTION_ALLOWED_ORIGINS = [
  'https://antifake.io.vn',
  'https://www.antifake.io.vn',
  'https://api.antifake.io.vn',
];

function parseOriginList(value?: string) {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function resolveAllowedOrigins(configService: ConfigService) {
  const isProduction =
    configService.get<string>('NODE_ENV')?.trim() === 'production';

  return Array.from(new Set([
    ...PRODUCTION_ALLOWED_ORIGINS,
    ...(isProduction ? [] : DEVELOPMENT_ALLOWED_ORIGINS),
    ...parseOriginList(configService.get<string>('CORS_ALLOWED_ORIGINS')),
    ...parseOriginList(configService.get<string>('CORS_ORIGIN')),
    ...parseOriginList(configService.get<string>('FRONTEND_URL')),
  ]));
}

export function configureHttpCors(
  app: INestApplication,
  configService: ConfigService,
) {
  const allowedOrigins = new Set(resolveAllowedOrigins(configService));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Request-Id'],
  });
}

export function configureHttpBodyParser(
  app: INestApplication,
  configService: ConfigService,
) {
  const limit = configService.get<string>('API_JSON_BODY_LIMIT') ?? DEFAULT_BODY_LIMIT;

  app.use(json({ limit }));
  app.use(urlencoded({ extended: true, limit }));
}

export function configureRootSwaggerRedirect(
  app: INestApplication,
  swaggerPath = 'swagger',
) {
  app.use(
    '/',
    (
      request: { method?: string; originalUrl?: string; url?: string },
      response: {
        end: () => void;
        redirect: (status: number, path: string) => void;
        status: (status: number) => { end: () => void };
      },
      next: () => void,
    ) => {
      const isRoot = request.originalUrl === '/' || request.url === '/';

      if (request.method === 'HEAD' && isRoot) {
        response.status(200).end();
        return;
      }

      if (request.method === 'GET' && isRoot) {
        response.redirect(302, `/${swaggerPath}`);
        return;
      }

      next();
    },
  );
}
