import 'dotenv/config';
import {
  bootstrapEmbeddedDeployment,
  EmbeddedDeployment,
} from './deploy-bootstrap';
import {
  acquirePassengerProcessLock,
  createAsyncSingleton,
  PassengerProcessLock,
  validatePassengerEnvironment,
} from './passenger-runtime';

let deployment: EmbeddedDeployment | undefined;
let processLock: PassengerProcessLock | undefined;
let shutdownPromise: Promise<void> | undefined;

async function bootstrapPassenger() {
  const configuration = validatePassengerEnvironment(process.env);
  processLock = acquirePassengerProcessLock();

  try {
    deployment = await bootstrapEmbeddedDeployment({
      httpPort: configuration.httpPort,
      servicePorts: configuration.servicePorts,
    });
  } catch (error) {
    processLock.release();
    processLock = undefined;
    throw error;
  }

  process.once('SIGTERM', () => {
    void shutdownPassenger('SIGTERM');
  });
  process.once('SIGINT', () => {
    void shutdownPassenger('SIGINT');
  });

  console.log(
    `[passenger] bootstrap succeeded for PID ${process.pid} using environment PORT=${configuration.httpPort}`,
  );
  return deployment;
}

async function shutdownPassenger(signal: NodeJS.Signals) {
  shutdownPromise ??= (async () => {
    console.log(`[passenger] received ${signal}; shutting down safely`);
    try {
      await deployment?.close();
      console.log('[passenger] shutdown completed');
    } catch (error) {
      process.exitCode = 1;
      console.error('[passenger] shutdown failed', error);
    } finally {
      processLock?.release();
      processLock = undefined;
    }
  })();

  return shutdownPromise;
}

export const startPassenger = createAsyncSingleton(bootstrapPassenger);

void startPassenger().catch((error) => {
  process.exitCode = 1;
  console.error('[passenger] bootstrap failed', error);
});
