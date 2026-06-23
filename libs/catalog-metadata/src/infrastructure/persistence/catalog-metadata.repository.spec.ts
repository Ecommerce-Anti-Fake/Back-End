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
      data: { name: 'My pham', parentId: 'parent-1', riskTier: 'medium' },
    });
  });
});
