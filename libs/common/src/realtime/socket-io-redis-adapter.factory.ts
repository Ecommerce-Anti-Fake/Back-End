import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { RealtimeRedisConfig } from './redis-realtime.config';

export type SocketIoRedisAdapterHandle = {
  adapter: ReturnType<typeof createAdapter>;
  close: () => Promise<void>;
};

export async function createSocketIoRedisAdapter(
  config: RealtimeRedisConfig,
): Promise<SocketIoRedisAdapterHandle | null> {
  if (!config.enabled || !config.url) {
    return null;
  }

  const pubClient = createClient({
    url: config.url,
    name: `${config.connectionName}:pub`,
  });
  const subClient = pubClient.duplicate({
    name: `${config.connectionName}:sub`,
  });

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
  } catch (error) {
    await Promise.allSettled([pubClient.quit(), subClient.quit()]);
    throw error;
  }

  return {
    adapter: createAdapter(pubClient, subClient),
    close: async () => {
      await Promise.allSettled([pubClient.quit(), subClient.quit()]);
    },
  };
}
