import { CatalogMetadataRepository } from './catalog-metadata.repository';

describe('CatalogMetadataRepository', () => {
  it('lists brands, categories, and active shipping carriers with stable ordering', async () => {
    const prisma = {
      brand: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      category: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      shippingCarrier: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const repository = new CatalogMetadataRepository(prisma as never);

    await repository.findAllBrands();
    await repository.findAllCategories();
    await repository.findActiveShippingCarriers();

    expect(prisma.brand.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
    expect(prisma.shippingCarrier.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  });

  it('creates brands and categories through catalog metadata ownership', async () => {
    const prisma = {
      brand: {
        create: jest.fn().mockResolvedValue({ id: 'brand-1' }),
      },
      category: {
        findUnique: jest.fn().mockResolvedValue({ id: 'parent-1' }),
        create: jest.fn().mockResolvedValue({ id: 'category-1' }),
      },
    };
    const repository = new CatalogMetadataRepository(prisma as never);

    await repository.createBrand({
      name: 'Brand ABC',
      registryStatus: 'verified',
    });
    await repository.findCategoryById('parent-1');
    await repository.createCategory({
      name: 'My pham',
      parentId: 'parent-1',
      imageUrl: 'https://cdn.test/categories/my-pham.jpg',
      riskTier: 'medium',
    });

    expect(prisma.brand.create).toHaveBeenCalledWith({
      data: { name: 'Brand ABC', registryStatus: 'verified' },
    });
    expect(prisma.category.findUnique).toHaveBeenCalledWith({
      where: { id: 'parent-1' },
      select: { id: true },
    });
    expect(prisma.category.create).toHaveBeenCalledWith({
      data: {
        name: 'My pham',
        parentId: 'parent-1',
        imageUrl: 'https://cdn.test/categories/my-pham.jpg',
        riskTier: 'medium',
      },
    });
  });

  it('looks up verification labels by hash and returns only public batch context', async () => {
    const prisma = {
      verificationLabel: {
        findFirst: jest.fn().mockResolvedValue({
          labelType: 'QR_BATCH',
          labelStatus: 'active',
          scopeType: 'SUPPLY_BATCH',
          scopeId: 'batch-1',
          issuedAt: new Date('2026-08-01T00:00:00.000Z'),
          brand: { name: 'Brand ABC' },
          provenance: [],
        }),
      },
      supplyBatch: {
        findUnique: jest.fn().mockResolvedValue({
          modelName: 'Model One',
          batchNumber: 'BATCH-0001',
          countryOfOrigin: 'Việt Nam',
          sourceType: 'MANUFACTURING',
          offerLinks: [{ offer: { title: 'Product One' } }],
        }),
      },
    };
    const repository = new CatalogMetadataRepository(prisma as never);

    await expect(
      repository.findVerificationLabelByCodeHash('hash'),
    ).resolves.toEqual(expect.objectContaining({ labelType: 'QR_BATCH' }));
    await expect(
      repository.findSupplyBatchVerificationContext('batch-1'),
    ).resolves.toEqual({
      modelName: 'Model One',
      batchNumber: 'BATCH-0001',
      countryOfOrigin: 'Việt Nam',
      sourceType: 'MANUFACTURING',
      offerTitle: 'Product One',
    });

    expect(prisma.verificationLabel.findFirst).toHaveBeenCalledWith({
      where: { codeHash: 'hash' },
      select: {
        labelType: true,
        labelStatus: true,
        scopeType: true,
        scopeId: true,
        issuedAt: true,
        brand: { select: { name: true } },
        provenance: {
          orderBy: { occurredAt: 'asc' },
          select: { eventType: true, channel: true, occurredAt: true },
        },
      },
    });
    expect(prisma.supplyBatch.findUnique).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      select: {
        modelName: true,
        batchNumber: true,
        countryOfOrigin: true,
        sourceType: true,
        offerLinks: {
          take: 1,
          orderBy: { createdAt: 'asc' },
          select: { offer: { select: { title: true } } },
        },
      },
    });
  });
});
