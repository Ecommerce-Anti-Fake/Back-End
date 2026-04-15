import { Test, TestingModule } from '@nestjs/testing';
import { CreateDistributionNetworkUseCase } from './create-distribution-network.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('CreateDistributionNetworkUseCase', () => {
  let useCase: CreateDistributionNetworkUseCase;

  const repositoryMock = {
    findBrandById: jest.fn(),
    findOwnedManufacturerShop: jest.fn(),
    createNetworkWithRootNode: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateDistributionNetworkUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<CreateDistributionNetworkUseCase>(CreateDistributionNetworkUseCase);
  });

  it('should create a distribution network for an owned manufacturer shop', async () => {
    repositoryMock.findBrandById.mockResolvedValueOnce({ id: 'brand-1' });
    repositoryMock.findOwnedManufacturerShop.mockResolvedValueOnce({ id: 'shop-1' });
    repositoryMock.createNetworkWithRootNode.mockResolvedValueOnce({
      id: 'network-1',
      brandId: 'brand-1',
      manufacturerShopId: 'shop-1',
      networkName: 'North Distributor Tree',
      networkStatus: 'ACTIVE',
      maxAgentDepth: 3,
      createdAt: new Date('2026-04-14T10:00:00.000Z'),
    });

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      brandId: 'brand-1',
      manufacturerShopId: 'shop-1',
      networkName: '  North Distributor Tree  ',
    });

    expect(repositoryMock.createNetworkWithRootNode).toHaveBeenCalledWith({
      brandId: 'brand-1',
      manufacturerShopId: 'shop-1',
      networkName: 'North Distributor Tree',
    });
    expect(result).toMatchObject({
      id: 'network-1',
      brandId: 'brand-1',
      manufacturerShopId: 'shop-1',
      networkName: 'North Distributor Tree',
    });
  });

  it('should reject when manufacturer shop is not owned by current user', async () => {
    repositoryMock.findBrandById.mockResolvedValueOnce({ id: 'brand-1' });
    repositoryMock.findOwnedManufacturerShop.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        brandId: 'brand-1',
        manufacturerShopId: 'shop-1',
        networkName: 'North Distributor Tree',
      }),
    ).rejects.toThrow('Manufacturer shop is invalid or not owned by current user');
  });
});
