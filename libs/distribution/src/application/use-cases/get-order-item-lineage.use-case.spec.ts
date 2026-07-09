import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { GetOrderItemLineageUseCase } from './get-order-item-lineage.use-case';

describe('GetOrderItemLineageUseCase', () => {
  let useCase: GetOrderItemLineageUseCase;

  const repositoryMock = {
    findLineageOrderItem: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOrderItemLineageUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<GetOrderItemLineageUseCase>(GetOrderItemLineageUseCase);
  });

  it('resolves upstream manufacturer batch through L1, L2, and L3 resale order items', async () => {
    const items = new Map([
      [
        'item-l3',
        lineageItem({
          id: 'item-l3',
          orderId: 'order-l3',
          sellerShopId: 'shop-l3',
          sellerShopName: 'L3 Shop',
          buyerShopId: null,
          buyerShopName: null,
          allocationBatchId: 'batch-l3',
          allocationBatchNumber: 'BATCH-L3',
          allocationSourceOrderItemId: 'item-l2',
          allocationShopName: 'L3 Shop',
        }),
      ],
      [
        'item-l2',
        lineageItem({
          id: 'item-l2',
          orderId: 'order-l2',
          sellerShopId: 'shop-l2',
          sellerShopName: 'L2 Shop',
          buyerShopId: 'shop-l3',
          buyerShopName: 'L3 Shop',
          allocationBatchId: 'batch-l2',
          allocationBatchNumber: 'BATCH-L2',
          allocationSourceOrderItemId: 'item-l1',
          allocationShopName: 'L2 Shop',
        }),
      ],
      [
        'item-l1',
        lineageItem({
          id: 'item-l1',
          orderId: 'order-l1',
          sellerShopId: 'shop-manufacturer',
          sellerShopName: 'Manufacturer Shop',
          buyerShopId: 'shop-l1',
          buyerShopName: 'L1 Shop',
          allocationBatchId: 'batch-manufacturer',
          allocationBatchNumber: 'BATCH-MFG',
          allocationSourceOrderItemId: null,
          allocationShopName: 'Manufacturer Shop',
          allocationSourceType: 'MANUFACTURER',
        }),
      ],
    ]);

    repositoryMock.findLineageOrderItem.mockImplementation((orderItemId: string) => Promise.resolve(items.get(orderItemId) ?? null));

    const result = await useCase.execute({ requesterUserId: 'buyer-user', orderItemId: 'item-l3' });

    expect(result.orderItemId).toBe('item-l3');
    expect(result.terminalBatches).toHaveLength(1);
    expect(result.terminalBatches[0]).toMatchObject({
      batchId: 'batch-manufacturer',
      batchNumber: 'BATCH-MFG',
      sourceType: 'MANUFACTURER',
    });
    expect(result.hops.map((hop) => hop.orderItemId)).toEqual(['item-l1', 'item-l2', 'item-l3']);
    expect(result.hops.map((hop) => hop.sellerShopName)).toEqual(['Manufacturer Shop', 'L2 Shop', 'L3 Shop']);
  });

  it('rejects inaccessible root order items', async () => {
    repositoryMock.findLineageOrderItem.mockResolvedValueOnce(
      lineageItem({
        id: 'item-l3',
        orderId: 'order-l3',
        sellerShopId: 'shop-l3',
        sellerShopName: 'L3 Shop',
        buyerShopId: null,
        buyerShopName: null,
        allocationBatchId: 'batch-l3',
        allocationBatchNumber: 'BATCH-L3',
        allocationSourceOrderItemId: null,
        allocationShopName: 'L3 Shop',
        buyerUserId: 'other-user',
        sellerOwnerUserId: 'seller-user',
      }),
    );

    await expect(useCase.execute({ requesterUserId: 'buyer-user', orderItemId: 'item-l3' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('uses the order item offer shop for multi-shop lineage ownership and output', async () => {
    const item = lineageItem({
      id: 'item-shop-2',
      orderId: 'order-multi',
      sellerShopId: 'shop-2',
      sellerShopName: 'Shop Two',
      buyerShopId: null,
      buyerShopName: null,
      allocationBatchId: 'batch-2',
      allocationBatchNumber: 'BATCH-2',
      allocationSourceOrderItemId: null,
      allocationShopName: 'Shop Two',
      buyerUserId: 'other-buyer',
      sellerOwnerUserId: 'seller-2',
    });
    item.order.shop = {
      id: 'legacy-shop',
      shopName: 'Legacy Shop',
      ownerUserId: 'legacy-owner',
      registrationType: 'RETAILER',
    };
    repositoryMock.findLineageOrderItem.mockResolvedValueOnce(item);

    const result = await useCase.execute({ requesterUserId: 'seller-2', orderItemId: 'item-shop-2' });

    expect(result.hops[0]).toMatchObject({
      sellerShopId: 'shop-2',
      sellerShopName: 'Shop Two',
    });
  });
});

function lineageItem(input: {
  id: string;
  orderId: string;
  sellerShopId: string;
  sellerShopName: string;
  buyerShopId: string | null;
  buyerShopName: string | null;
  allocationBatchId: string;
  allocationBatchNumber: string;
  allocationSourceOrderItemId: string | null;
  allocationShopName: string;
  allocationSourceType?: string;
  buyerUserId?: string;
  sellerOwnerUserId?: string;
}) {
  return {
    id: input.id,
    offerId: `offer-${input.id}`,
    offerTitleSnapshot: `Offer ${input.id}`,
    quantity: 10,
    order: {
      id: input.orderId,
      buyerUserId: input.buyerUserId ?? 'buyer-user',
      buyerShopId: input.buyerShopId,
      buyerShop: input.buyerShopId
        ? {
            id: input.buyerShopId,
            shopName: input.buyerShopName,
            ownerUserId: 'buyer-user',
          }
        : null,
      shop: {
        id: input.sellerShopId,
        shopName: input.sellerShopName,
        ownerUserId: input.sellerOwnerUserId ?? 'seller-user',
        registrationType: input.sellerShopId === 'shop-manufacturer' ? 'MANUFACTURER' : 'DISTRIBUTOR',
      },
    },
    offer: {
      shop: {
        id: input.sellerShopId,
        shopName: input.sellerShopName,
        ownerUserId: input.sellerOwnerUserId ?? 'seller-user',
        registrationType: input.sellerShopId === 'shop-manufacturer' ? 'MANUFACTURER' : 'DISTRIBUTOR',
      },
    },
    batchAllocations: [
      {
        id: `allocation-${input.allocationBatchId}`,
        quantity: 10,
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        batchId: input.allocationBatchId,
        batch: {
          id: input.allocationBatchId,
          shopId: input.sellerShopId,
          productModelId: 'model-1',
          distributionNodeId: null,
          batchNumber: input.allocationBatchNumber,
          quantity: 100,
          sourceName: input.allocationShopName,
          countryOfOrigin: 'VN',
          sourceType: input.allocationSourceType ?? 'WHOLESALE_ORDER',
          sourceOrderId: input.allocationSourceOrderItemId ? `order-for-${input.allocationSourceOrderItemId}` : null,
          sourceOrderItemId: input.allocationSourceOrderItemId,
          receivedAt: new Date('2026-05-17T10:00:00.000Z'),
          shop: {
            id: input.sellerShopId,
            shopName: input.allocationShopName,
          },
          distributionNode: null,
        },
      },
    ],
  };
}
