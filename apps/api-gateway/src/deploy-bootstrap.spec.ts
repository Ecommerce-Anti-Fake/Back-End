import { EventEmitter } from 'node:events';
import {
  createIdempotentShutdown,
  listenHttpServer,
} from './passenger-runtime';

class FakeHttpServer extends EventEmitter {
  listen = jest.fn((...args: unknown[]) => {
    const callback = args.at(-1);
    if (typeof callback === 'function') {
      (callback as () => void)();
    }
    return this;
  });
}

describe('deploy bootstrap runtime helpers', () => {
  it('starts the Passenger HTTP server once without forcing a host', async () => {
    const server = new FakeHttpServer();

    await listenHttpServer(server, 3000);

    expect(server.listen).toHaveBeenCalledTimes(1);
    expect(server.listen).toHaveBeenCalledWith(3000, expect.any(Function));
  });

  it('keeps the existing deploy host binding when one is provided', async () => {
    const server = new FakeHttpServer();

    await listenHttpServer(server, 10000, '0.0.0.0');

    expect(server.listen).toHaveBeenCalledTimes(1);
    expect(server.listen).toHaveBeenCalledWith(
      10000,
      '0.0.0.0',
      expect.any(Function),
    );
  });

  it('closes gateway and microservices only once', async () => {
    const gateway = { close: jest.fn(() => Promise.resolve()) };
    const auth = { close: jest.fn(() => Promise.resolve()) };
    const users = { close: jest.fn(() => Promise.resolve()) };
    const close = createIdempotentShutdown(gateway, [auth, users]);

    await Promise.all([close(), close()]);

    expect(gateway.close).toHaveBeenCalledTimes(1);
    expect(users.close).toHaveBeenCalledTimes(1);
    expect(auth.close).toHaveBeenCalledTimes(1);
    expect(gateway.close.mock.invocationCallOrder[0]).toBeLessThan(
      users.close.mock.invocationCallOrder[0],
    );
    expect(users.close.mock.invocationCallOrder[0]).toBeLessThan(
      auth.close.mock.invocationCallOrder[0],
    );
  });
});
