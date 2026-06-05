import { OrdersController } from './orders.controller';
import { OrdersRpcService } from './orders-rpc.service';

describe('OrdersController', () => {
  let ordersRpcService: Pick<OrdersRpcService, 'getFulfillmentAudit'>;
  const dashboardSseBrokerService = {
    notifyOrderChanged: jest.fn(),
    notifyAccount: jest.fn(),
    notifyAdminQueue: jest.fn(),
  };
  let controller: OrdersController;

  beforeEach(() => {
    ordersRpcService = {
      getFulfillmentAudit: jest.fn().mockResolvedValue([]),
    };
    controller = new OrdersController(ordersRpcService as OrdersRpcService, dashboardSseBrokerService as never);
  });

  it('routes generic order audit reads through the existing audit RPC call', async () => {
    await controller.getAudit('order-1', 'user-1', { role: 'admin' });

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
});
