import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://antifake.io.vn',
  'https://www.antifake.io.vn',
];

function parseOriginList(value?: string) {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getAllowedOrigins(configService: ConfigService) {
  return new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...parseOriginList(configService.get<string>('CORS_ALLOWED_ORIGINS')),
    ...parseOriginList(configService.get<string>('CORS_ORIGIN')),
    ...parseOriginList(configService.get<string>('FRONTEND_URL')),
  ]);
}

export function configureHttpCors(
  app: INestApplication,
  configService: ConfigService,
) {
  const allowedOrigins = getAllowedOrigins(configService);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Request-Id'],
  });
}

export function configureRootSwaggerRedirect(
  app: INestApplication,
  swaggerPath = 'swagger',
) {
  app.use(
    '/',
    (
      request: { method?: string; originalUrl?: string; url?: string },
      response: { redirect: (status: number, path: string) => void },
      next: () => void,
    ) => {
      if (
        request.method === 'GET' &&
        (request.originalUrl === '/' || request.url === '/')
      ) {
        response.redirect(302, `/${swaggerPath}`);
        return;
      }

      next();
    },
  );
}
