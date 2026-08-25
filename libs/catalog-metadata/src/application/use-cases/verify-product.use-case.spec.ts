import { VerifyProductUseCase } from './verify-product.use-case';

describe('VerifyProductUseCase', () => {
  const repository = {
    findVerificationLabelByCodeHash: jest.fn(),
    findSupplyBatchVerificationContext: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns a verified result with public provenance data for a direct code', async () => {
    repository.findVerificationLabelByCodeHash.mockResolvedValue({
      labelType: 'QR_BATCH',
      labelStatus: 'active',
      issuedAt: new Date('2026-08-01T00:00:00.000Z'),
      scopeType: 'SUPPLY_BATCH',
      scopeId: 'batch-1',
      brand: { name: 'Brand ABC' },
      provenance: [
        {
          eventType: 'VERIFIED',
          channel: 'mobile_scan',
          occurredAt: new Date('2026-08-02T00:00:00.000Z'),
        },
      ],
    });
    repository.findSupplyBatchVerificationContext.mockResolvedValue({
      modelName: 'Model One',
      batchNumber: 'BATCH-0001',
      countryOfOrigin: 'Việt Nam',
      sourceType: 'MANUFACTURING',
      offerTitle: 'Product One',
    });

    await expect(
      new VerifyProductUseCase(repository as never).execute({
        code: ' ANTIFAKE-CODE-1 ',
      }),
    ).resolves.toEqual({
      status: 'VERIFIED',
      labelType: 'QR_BATCH',
      issuedAt: new Date('2026-08-01T00:00:00.000Z'),
      brandName: 'Brand ABC',
      productName: 'Product One',
      modelName: 'Model One',
      batchNumber: 'BATCH-0001',
      countryOfOrigin: 'Việt Nam',
      sourceType: 'MANUFACTURING',
      provenance: [
        {
          eventType: 'VERIFIED',
          channel: 'mobile_scan',
          occurredAt: new Date('2026-08-02T00:00:00.000Z'),
        },
      ],
    });

    expect(repository.findVerificationLabelByCodeHash).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
  });

  it('extracts and normalizes a verification code from an HTTPS link', async () => {
    repository.findVerificationLabelByCodeHash.mockResolvedValue(null);

    await expect(
      new VerifyProductUseCase(repository as never).execute({
        code: 'https://antifake.example/verify?code=abc-123',
      }),
    ).resolves.toMatchObject({
      status: 'NOT_FOUND',
      provenance: [],
    });

    expect(repository.findVerificationLabelByCodeHash).toHaveBeenCalledWith(
      expect.any(String),
    );
  });

  it('returns suspicious status without exposing internal hashes or actor data', async () => {
    repository.findVerificationLabelByCodeHash.mockResolvedValue({
      labelType: 'QR_PRODUCT',
      labelStatus: 'suspicious',
      issuedAt: new Date('2026-08-01T00:00:00.000Z'),
      scopeType: 'OTHER',
      scopeId: 'internal-scope',
      brand: { name: 'Brand ABC' },
      provenance: [],
    });

    const result = await new VerifyProductUseCase(repository as never).execute({
      code: 'ABC-123456',
    });

    expect(result).toMatchObject({
      status: 'SUSPICIOUS',
      labelType: 'QR_PRODUCT',
    });
    expect(result).not.toHaveProperty('codeHash');
    expect(result).not.toHaveProperty('scopeId');
  });

  it('rejects non-HTTP links and empty input before querying the repository', async () => {
    const useCase = new VerifyProductUseCase(repository as never);

    await expect(
      useCase.execute({ code: 'javascript:alert(1)' }),
    ).rejects.toThrow('Verification code or HTTPS link is required');
    await expect(useCase.execute({ code: '   ' })).rejects.toThrow(
      'Verification code or HTTPS link is required',
    );

    expect(repository.findVerificationLabelByCodeHash).not.toHaveBeenCalled();
  });
});
