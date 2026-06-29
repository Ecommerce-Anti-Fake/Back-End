import { OrderController } from './order.controller';
import { OrdersRpcService } from './orders-rpc.service';

describe('OrderController', () => {
  let ordersRpcService: Pick<OrdersRpcService, 'getFulfillmentAudit' | 'findSellerShopOrders'>;
  const dashboardSseBrokerService = {
    notifyOrderChanged: jest.fn(),
    notifyAccount: jest.fn(),
    notifyAdminQueue: jest.fn(),
  };
  let controller: OrderController;

  beforeEach(() => {
    ordersRpcService = {
      getFulfillmentAudit: jest.fn().mockResolvedValue([]),
      findSellerShopOrders: jest.fn().mockResolvedValue({
        total: 1,
        page: 1,
        pageSize: 20,
        items: [],
      }),
    };
    controller = new OrderController(ordersRpcService as OrdersRpcService, dashboardSseBrokerService as never);
  });

  it('routes generic order audit reads through the existing audit RPC call', async () => {
    await controller.getOrderAudit('order-1', 'user-1', { role: 'admin' });

    expect(ordersRpcService.getFulfillmentAudit).toHaveBeenCalledWith({
      id: 'order-1',
      requesterUserId: 'user-1',
      requesterRole: 'admin',
    });
  });

  it('keeps fulfillment audit compatibility route behavior', async () => {
    await controller.getFulfillmentAudit('order-1', 'user-1');

    expect(ordersRpcService.getFulfillmentAudit).toHaveBeenCalledWith({
      id: 'order-1',
      requesterUserId: 'user-1',
      requesterRole: undefined,
    });
  });

  it('passes seller shop order pagination and status filter to RPC', async () => {
    await controller.findSellerShopOrders('shop-1', 'seller-1', {
      orderStatus: 'pending',
      page: 2,
      pageSize: 10,
    });

    expect(ordersRpcService.findSellerShopOrders).toHaveBeenCalledWith({
      shopId: 'shop-1',
      requesterUserId: 'seller-1',
      orderStatus: 'pending',
      page: 2,
      pageSize: 10,
    });
  });

});
