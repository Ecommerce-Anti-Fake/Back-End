import { PayoutAccountSecurityService } from '../../domain';
import { BankAccountVerificationService } from './bank-account-verification.service';

describe('BankAccountVerificationService', () => {
  const now = new Date('2026-07-27T04:00:00.000Z');
  const prisma = {
    bankAccountVerification: { create: jest.fn() },
  };
  const walletService = {
    canAccessShopWallet: jest.fn(),
  };
  const lookup = {
    listBanks: jest.fn(),
    lookupAccount: jest.fn(),
  };
  const security = new PayoutAccountSecurityService({
    get: jest.fn(() => '44'.repeat(32)),
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now.getTime());
    walletService.canAccessShopWallet.mockResolvedValue(true);
    lookup.listBanks.mockResolvedValue([{
      bin: '970436',
      code: 'VCB',
      name: 'Ngân hàng TMCP Ngoại thương Việt Nam',
      shortName: 'Vietcombank',
      logo: null,
      lookupSupported: true,
      transferSupported: true,
    }]);
    lookup.lookupAccount.mockResolvedValue({
      accountHolder: 'TRAN VAN B',
      provider: 'VIETQR',
    });
    prisma.bankAccountVerification.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => ({
        id: 'verification-1',
        ...data,
      }),
    );
  });

  afterEach(() => jest.useRealTimers());

  it('stores an encrypted provider result without comparing it to KYC', async () => {
    const service = new BankAccountVerificationService(
      prisma as never,
      walletService as never,
      security,
      lookup as never,
    );

    const result = await service.verify({
      userId: 'user-1',
      requesterRole: 'user',
      shopId: 'shop-1',
      bankBin: '970436',
      accountNumber: '0123456789',
    });

    expect(lookup.lookupAccount).toHaveBeenCalledWith({
      bankBin: '970436',
      accountNumber: '0123456789',
    });
    const stored = prisma.bankAccountVerification.create.mock.calls[0][0].data;
    expect(stored.accountNumberEncrypted).not.toContain('0123456789');
    expect(stored.accountHolder).toBe('TRAN VAN B');
    expect(stored.expiresAt).toEqual(new Date('2026-07-27T04:10:00.000Z'));
    expect(result).toEqual({
      verificationId: 'verification-1',
      bank: {
        bin: '970436',
        code: 'VCB',
        name: 'Ngân hàng TMCP Ngoại thương Việt Nam',
        shortName: 'Vietcombank',
        logo: null,
      },
      accountNumberMasked: '******6789',
      accountHolder: 'TRAN VAN B',
      expiresAt: new Date('2026-07-27T04:10:00.000Z'),
    });
  });

  it('rejects lookup for a shop the requester cannot manage', async () => {
    walletService.canAccessShopWallet.mockResolvedValueOnce(false);
    const service = new BankAccountVerificationService(
      prisma as never,
      walletService as never,
      security,
      lookup as never,
    );

    await expect(service.verify({
      userId: 'user-1',
      requesterRole: 'user',
      shopId: 'shop-2',
      bankBin: '970436',
      accountNumber: '0123456789',
    })).rejects.toThrow('You cannot access this shop wallet');
    expect(lookup.lookupAccount).not.toHaveBeenCalled();
  });

  it('rejects banks that do not support account lookup', async () => {
    lookup.listBanks.mockResolvedValueOnce([{
      bin: '970436',
      code: 'VCB',
      name: 'Bank',
      shortName: 'VCB',
      logo: null,
      lookupSupported: false,
      transferSupported: true,
    }]);
    const service = new BankAccountVerificationService(
      prisma as never,
      walletService as never,
      security,
      lookup as never,
    );

    await expect(service.verify({
      userId: 'user-1',
      requesterRole: 'user',
      bankBin: '970436',
      accountNumber: '0123456789',
    })).rejects.toThrow('Ngân hàng này chưa hỗ trợ tra cứu tài khoản');
  });
});
