import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns a deploy smoke payload', () => {
    const response = new HealthController().getHealth();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('api-gateway');
    expect(response.startedAt).toBeDefined();
    expect(response.timestamp).toBeDefined();
    expect(response.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
