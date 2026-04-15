import { Test, TestingModule } from '@nestjs/testing';
import { DispatchDistributionShipmentUseCase } from './dispatch-distribution-shipment.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('DispatchDistributionShipmentUseCase', () => {
  let useCase: DispatchDistributionShipmentUseCase;

  const repositoryMock = {
    findDispatchableShipmentById: jest.fn(),
    dispatchShipment: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchDistributionShipmentUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<DispatchDistributionShipmentUseCase>(DispatchDistributionShipmentUseCase);
  });

  it('should dispatch a draft shipment', async () => {
    repositoryMock.findDispatchableShipmentById.mockResolvedValueOnce({
      id: 'shipment-1',
      shipmentStatus: 'DRAFT',
      items: [],
    });
    repositoryMock.dispatchShipment.mockResolvedValueOnce({
      id: 'shipment-1',
      networkId: 'network-1',
      fromNodeId: 'node-1',
      toNodeId: 'node-2',
      shipmentCode: 'SHIP-001',
      shipmentStatus: 'IN_TRANSIT',
      note: null,
      shippedAt: new Date('2026-04-15T09:00:00.000Z'),
      receivedAt: null,
      createdAt: new Date('2026-04-15T08:00:00.000Z'),
      items: [],
    });

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      shipmentId: 'shipment-1',
    });

    expect(repositoryMock.dispatchShipment).toHaveBeenCalledWith('shipment-1');
    expect(result).toMatchObject({
      id: 'shipment-1',
      shipmentStatus: 'IN_TRANSIT',
    });
  });
});
