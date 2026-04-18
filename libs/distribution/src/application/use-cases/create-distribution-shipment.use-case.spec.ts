import { Test, TestingModule } from '@nestjs/testing';
import { CreateDistributionShipmentUseCase } from './create-distribution-shipment.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('CreateDistributionShipmentUseCase', () => {
  let useCase: CreateDistributionShipmentUseCase;

  const repositoryMock = {
    findOwnedNetworkByUser: jest.fn(),
    findNodeById: jest.fn(),
    findBatchesByIdsAndNode: jest.fn(),
    createShipment: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateDistributionShipmentUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<CreateDistributionShipmentUseCase>(CreateDistributionShipmentUseCase);
  });

  it('should create shipment between parent-child nodes', async () => {
    repositoryMock.findOwnedNetworkByUser.mockResolvedValueOnce({
      id: 'network-1',
      manufacturerShop: {
        id: 'shop-mnf-1',
        shopStatus: 'active',
      },
    });
    repositoryMock.findNodeById
      .mockResolvedValueOnce({
        id: 'node-parent',
        networkId: 'network-1',
        parentNodeId: null,
        relationshipStatus: 'ACTIVE',
        shop: {
          id: 'shop-parent',
          shopStatus: 'active',
        },
      })
      .mockResolvedValueOnce({
        id: 'node-child',
        networkId: 'network-1',
        parentNodeId: 'node-parent',
        relationshipStatus: 'ACTIVE',
        shop: {
          id: 'shop-child',
          shopStatus: 'active',
        },
      });
    repositoryMock.findBatchesByIdsAndNode.mockResolvedValueOnce([
      { id: 'batch-1', productModelId: 'pm-1', quantity: 100, batchNumber: 'BATCH-1', offerLinks: [] },
    ]);
    repositoryMock.createShipment.mockResolvedValueOnce({
      id: 'shipment-1',
      networkId: 'network-1',
      fromNodeId: 'node-parent',
      toNodeId: 'node-child',
      shipmentCode: 'SHIP-001',
      shipmentStatus: 'DRAFT',
      note: null,
      shippedAt: null,
      receivedAt: null,
      createdAt: new Date('2026-04-15T09:00:00.000Z'),
      items: [
        {
          id: 'item-1',
          batchId: 'batch-1',
          productModelId: 'pm-1',
          quantity: 100,
          unitCost: { toString: () => '120000' },
        },
      ],
    });

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      networkId: 'network-1',
      fromNodeId: 'node-parent',
      toNodeId: 'node-child',
      shipmentCode: 'SHIP-001',
      items: [
        {
          batchId: 'batch-1',
          productModelId: 'pm-1',
          quantity: 100,
          unitCost: 120000,
        },
      ],
    });

    expect(repositoryMock.createShipment).toHaveBeenCalled();
    expect(result).toMatchObject({
      id: 'shipment-1',
      shipmentCode: 'SHIP-001',
      shipmentStatus: 'DRAFT',
    });
  });

  it('should reject shipment between unrelated nodes', async () => {
    repositoryMock.findOwnedNetworkByUser.mockResolvedValueOnce({
      id: 'network-1',
      manufacturerShop: {
        id: 'shop-mnf-1',
        shopStatus: 'active',
      },
    });
    repositoryMock.findNodeById
      .mockResolvedValueOnce({
        id: 'node-a',
        networkId: 'network-1',
        parentNodeId: null,
        relationshipStatus: 'ACTIVE',
        shop: {
          id: 'shop-a',
          shopStatus: 'active',
        },
      })
      .mockResolvedValueOnce({
        id: 'node-b',
        networkId: 'network-1',
        parentNodeId: null,
        relationshipStatus: 'ACTIVE',
        shop: {
          id: 'shop-b',
          shopStatus: 'active',
        },
      });

    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        networkId: 'network-1',
        fromNodeId: 'node-a',
        toNodeId: 'node-b',
        shipmentCode: 'SHIP-002',
        items: [
          {
            batchId: 'batch-1',
            productModelId: 'pm-1',
            quantity: 10,
          },
        ],
      }),
    ).rejects.toThrow('Shipments are only allowed between directly related distribution nodes');
  });
});
