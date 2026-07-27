import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { VietQrBankAccountLookupService } from './vietqr-bank-account-lookup.service';

describe('VietQrBankAccountLookupService', () => {
  const config = {
    get: jest.fn((name: string) => ({
      BANK_ACCOUNT_LOOKUP_ENABLED: 'true',
      VIETQR_CLIENT_ID: 'client-id',
      VIETQR_API_KEY: 'api-key',
      VIETQR_API_BASE_URL: 'https://api.vietqr.test',
    })[name]),
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    config.get.mockClear();
  });

  it('returns a normalized bank directory and caches it', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        code: '00',
        data: [{
          bin: '970436',
          code: 'VCB',
          name: 'Ngân hàng TMCP Ngoại thương Việt Nam',
          shortName: 'Vietcombank',
          logo: 'https://api.vietqr.test/img/VCB.png',
          lookupSupported: 1,
          transferSupported: 1,
        }],
      }),
    } as never);
    const service = new VietQrBankAccountLookupService(config as never);

    await expect(service.listBanks()).resolves.toEqual([{
      bin: '970436',
      code: 'VCB',
      name: 'Ngân hàng TMCP Ngoại thương Việt Nam',
      shortName: 'Vietcombank',
      logo: 'https://api.vietqr.test/img/VCB.png',
      lookupSupported: true,
      transferSupported: true,
    }]);
    await service.listBanks();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('looks up the provider account holder with server-side credentials', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        code: '00',
        desc: 'Success',
        data: { accountName: 'NGUYEN VAN A' },
      }),
    } as never);
    const service = new VietQrBankAccountLookupService(config as never);

    await expect(service.lookupAccount({
      bankBin: '970436',
      accountNumber: '0123456789',
    })).resolves.toEqual({
      accountHolder: 'NGUYEN VAN A',
      provider: 'VIETQR',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.vietqr.test/v2/lookup',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-client-id': 'client-id',
          'x-api-key': 'api-key',
        }),
        body: JSON.stringify({ bin: '970436', accountNumber: '0123456789' }),
      }),
    );
  });

  it('rejects unknown accounts and malformed provider responses', async () => {
    const service = new VietQrBankAccountLookupService(config as never);
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ code: '21', desc: 'Account not found' }),
    } as never);
    await expect(service.lookupAccount({
      bankBin: '970436',
      accountNumber: '0123456789',
    })).rejects.toBeInstanceOf(BadRequestException);

    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ code: '00', data: {} }),
    } as never);
    await expect(service.lookupAccount({
      bankBin: '970436',
      accountNumber: '0123456789',
    })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
