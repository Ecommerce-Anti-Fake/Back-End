import { ActiveUserGuard } from '@security';
import { Test, TestingModule } from '@nestjs/testing';
import { GatewayVoucherModule } from './voucher.module';

describe('GatewayVoucherModule', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  let moduleRef: TestingModule | undefined;

  beforeAll(() => {
    process.env.JWT_SECRET = 'voucher-module-test-secret';
  });

  afterEach(async () => {
    await moduleRef?.close();
    moduleRef = undefined;
  });

  afterAll(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
      return;
    }

    process.env.JWT_SECRET = originalJwtSecret;
  });

  it('resolves ActiveUserGuard with its user identity dependency', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [GatewayVoucherModule],
    }).compile();

    expect(moduleRef.get(ActiveUserGuard)).toBeInstanceOf(ActiveUserGuard);
  });
});
