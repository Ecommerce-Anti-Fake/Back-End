import { Test, TestingModule } from '@nestjs/testing';
import { ReceiveDistributionShipmentUseCase } from './receive-distribution-shipment.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('ReceiveDistributionShipmentUseCase', () => {
  let useCase: ReceiveDistributionShipmentUseCase;

  const repositoryMock = {
    findReceivableShipmentById: jest.fn(),
    receiveShipment: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiveDistributionShipmentUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<ReceiveDistributionShipmentUseCase>(ReceiveDistributionShipmentUseCase);
  });

  it('should mark an in-transit shipment as delivered', async () => {
    repositoryMock.findReceivableShipmentById.mockResolvedValueOnce({
      id: 'shipment-1',
      toNodeId: 'node-2',
      shipmentStatus: 'IN_TRANSIT',
      items: [],
    });
    repositoryMock.receiveShipment.mockResolvedValueOnce({
      id: 'shipment-1',
      networkId: 'network-1',
      fromNodeId: 'node-1',
      toNodeId: 'node-2',
      shipmentCode: 'SHIP-001',
      shipmentStatus: 'DELIVERED',
      note: null,
      shippedAt: new Date('2026-04-15T09:00:00.000Z'),
      receivedAt: new Date('2026-04-16T09:00:00.000Z'),
      createdAt: new Date('2026-04-15T09:00:00.000Z'),
      items: [],
    });

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      shipmentId: 'shipment-1',
    });

    expect(repositoryMock.receiveShipment).toHaveBeenCalledWith('shipment-1', 'node-2');
    expect(result).toMatchObject({
      id: 'shipment-1',
      shipmentStatus: 'DELIVERED',
    });
  });

  it('should reject users who are not the receiving shop owner', async () => {
    repositoryMock.findReceivableShipmentById.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        requesterUserId: 'user-x',
        shipmentId: 'shipment-1',
      }),
    ).rejects.toThrow('Distribution shipment not found or not receivable by current user');
  });
});
