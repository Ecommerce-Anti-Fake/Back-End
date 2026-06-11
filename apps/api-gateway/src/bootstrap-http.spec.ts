import { ConfigService } from '@nestjs/config';

import { configureHttpCors, configureRootSwaggerRedirect } from './bootstrap-http';

describe('configureHttpCors', () => {
  it('allows Swagger UI requests from the local gateway origin', () => {
    const app = {
      enableCors: jest.fn(),
    };
    const configService = {
      get: jest.fn(),
    } as unknown as ConfigService;

    configureHttpCors(app as never, configService);

    const corsOptions = app.enableCors.mock.calls[0][0];
    const callback = jest.fn();

    corsOptions.origin('http://localhost:3001', callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });
});

describe('configureRootSwaggerRedirect', () => {
  const createHarness = () => {
    const app = {
      use: jest.fn(),
    };
    const response = {
      end: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    configureRootSwaggerRedirect(app as never);

    const middleware = app.use.mock.calls[0][1];

    return { app, middleware, next, response };
  };

  it('redirects GET / to Swagger', () => {
    const { middleware, next, response } = createHarness();

    middleware({ method: 'GET', originalUrl: '/', url: '/' }, response, next);

    expect(response.redirect).toHaveBeenCalledWith(302, '/swagger');
    expect(next).not.toHaveBeenCalled();
  });

  it('answers HEAD / without falling through to Nest 404 handling', () => {
    const { middleware, next, response } = createHarness();

    middleware({ method: 'HEAD', originalUrl: '/', url: '/' }, response, next);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('passes through non-root requests', () => {
    const { middleware, next, response } = createHarness();

    middleware({ method: 'HEAD', originalUrl: '/api/health', url: '/api/health' }, response, next);

    expect(response.status).not.toHaveBeenCalled();
    expect(response.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
