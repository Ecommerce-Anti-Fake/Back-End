import { OrderNotificationService } from './order-notification.service';

describe('OrderNotificationService', () => {
  const repository = { createNotification: jest.fn() };
  const service = new OrderNotificationService(repository as never);

  beforeEach(() => jest.resetAllMocks());

  it('notifies the buyer and every distinct seller when an order is created', async () => {
    await service.notifyCreated(order() as never);

    expect(repository.createNotification).toHaveBeenCalledTimes(3);
    expect(repository.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'buyer-1',
      notificationType: 'ORDER_CREATED',
      dedupeKey: 'ORDER_CREATED:order-1:buyer-1',
    }));
    expect(repository.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'seller-1',
      targetType: 'ORDER',
      targetId: 'order-1',
    }));
    expect(repository.createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'seller-2' }));
  });

  it('notifies affected participants except the cancellation actor', async () => {
    await service.notifyCancelled(order() as never, 'seller-1');

    expect(repository.createNotification).toHaveBeenCalledTimes(2);
    expect(repository.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'buyer-1',
      notificationType: 'ORDER_CANCELLED',
      dedupeKey: 'ORDER_CANCELLED:order-1:buyer-1',
    }));
    expect(repository.createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 'seller-2' }));
    expect(repository.createNotification).not.toHaveBeenCalledWith(expect.objectContaining({ userId: 'seller-1' }));
  });
});

function order() {
  return {
    id: 'order-1',
    buyerUserId: 'buyer-1',
    shop: { ownerUserId: 'seller-1' },
    shopGroups: [
      { shop: { ownerUserId: 'seller-1' } },
      { shop: { ownerUserId: 'seller-2' } },
    ],
  };
}
