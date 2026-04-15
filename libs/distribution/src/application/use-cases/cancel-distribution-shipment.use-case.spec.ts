import { Test, TestingModule } from '@nestjs/testing';
import { CancelDistributionShipmentUseCase } from './cancel-distribution-shipment.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('CancelDistributionShipmentUseCase', () => {
  let useCase: CancelDistributionShipmentUseCase;

  const repositoryMock = {
    findDispatchableShipmentById: jest.fn(),
    cancelShipment: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelDistributionShipmentUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<CancelDistributionShipmentUseCase>(CancelDistributionShipmentUseCase);
  });

  it('should cancel a draft shipment', async () => {
    repositoryMock.findDispatchableShipmentById.mockResolvedValueOnce({
      id: 'shipment-1',
      shipmentStatus: 'DRAFT',
      items: [],
    });
    repositoryMock.cancelShipment.mockResolvedValueOnce({
      id: 'shipment-1',
      networkId: 'network-1',
      fromNodeId: 'node-1',
      toNodeId: 'node-2',
      shipmentCode: 'SHIP-001',
      shipmentStatus: 'CANCELLED',
      note: null,
      shippedAt: null,
      receivedAt: null,
      createdAt: new Date('2026-04-15T08:00:00.000Z'),
      items: [],
    });

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      shipmentId: 'shipment-1',
    });

    expect(repositoryMock.cancelShipment).toHaveBeenCalledWith('shipment-1');
    expect(result).toMatchObject({
      id: 'shipment-1',
      shipmentStatus: 'CANCELLED',
    });
  });
});
