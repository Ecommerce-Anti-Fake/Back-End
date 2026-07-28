import 'dotenv/config';
import { bootstrapEmbeddedDeployment } from './deploy-bootstrap';
import {
  resolveEmbeddedServicePorts,
  resolveHttpPort,
} from './passenger-runtime';

async function bootstrap() {
  await bootstrapEmbeddedDeployment({
    httpPort: resolveHttpPort(process.env.PORT, 10000),
    httpHost: '0.0.0.0',
    servicePorts: resolveEmbeddedServicePorts(process.env),
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
