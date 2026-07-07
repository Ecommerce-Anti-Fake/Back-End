import { ArgumentsHost, HttpStatus, UnauthorizedException } from '@nestjs/common';

import { StructuredExceptionFilter } from './structured-exception.filter';

function createHost() {
  const request = {
    method: 'POST',
    originalUrl: '/api/offers',
    requestId: 'request-1',
    url: '/api/offers',
  };
  const response = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

describe('StructuredExceptionFilter', () => {
  it('logs expected 4xx exceptions as warnings', () => {
    const filter = new StructuredExceptionFilter();
    const logger = {
      error: jest.fn(),
      warn: jest.fn(),
    };
    Object.assign(filter, { logger });
    const { host, response } = createHost();

    filter.catch(new UnauthorizedException('Invalid access token'), host);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"statusCode":401'));
    expect(logger.error).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
  });

  it('maps body parser payload limit errors to HTTP 413', () => {
    const filter = new StructuredExceptionFilter();
    const logger = {
      error: jest.fn(),
      warn: jest.fn(),
    };
    Object.assign(filter, { logger });
    const { host, response } = createHost();
    const exception = Object.assign(new Error('request entity too large'), {
      name: 'PayloadTooLargeError',
      status: HttpStatus.PAYLOAD_TOO_LARGE,
    });

    filter.catch(exception, host);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"statusCode":413'));
    expect(logger.error).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message: 'Request payload too large',
      requestId: 'request-1',
    });
  });
});
