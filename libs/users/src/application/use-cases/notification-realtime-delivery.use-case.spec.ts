import { CreateNotificationUseCase } from './create-notification.use-case';
import {
  RegisterNotificationFcmTokenUseCase,
  RevokeNotificationFcmTokenUseCase,
} from './manage-notification-fcm-token.use-case';

describe('notification realtime delivery use cases', () => {
  const repository = {
    createNotification: jest.fn(),
    listActiveNotificationFcmTokens: jest.fn(),
    recordNotificationDeliveryAttempt: jest.fn(),
    registerNotificationFcmToken: jest.fn(),
    revokeNotificationFcmToken: jest.fn(),
  };
  const fcmDelivery = {
    sendToTokens: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers browser FCM token metadata for a user', async () => {
    repository.registerNotificationFcmToken.mockResolvedValue({
      id: 'token-row-1',
      deviceId: 'device-1',
      revokedAt: null,
      updatedAt: new Date('2026-06-04T12:00:00.000Z'),
    });

    const result = await new RegisterNotificationFcmTokenUseCase(
      repository as never,
    ).execute({
      userId: 'user-1',
      token: ' token-1 ',
      deviceId: 'device-1',
      userAgent: 'browser',
    });

    expect(repository.registerNotificationFcmToken).toHaveBeenCalledWith({
      userId: 'user-1',
      token: 'token-1',
      deviceId: 'device-1',
      userAgent: 'browser',
    });
    expect(result.id).toBe('token-row-1');
  });

  it('revokes a browser FCM token by token or device id', async () => {
    repository.revokeNotificationFcmToken.mockResolvedValue({ count: 1 });

    const result = await new RevokeNotificationFcmTokenUseCase(
      repository as never,
    ).execute({
      userId: 'user-1',
      deviceId: 'device-1',
    });

    expect(repository.revokeNotificationFcmToken).toHaveBeenCalledWith({
      userId: 'user-1',
      token: undefined,
      deviceId: 'device-1',
    });
    expect(result.revokedCount).toBe(1);
  });

  it('creates an idempotent in-app notification and records FCM delivery attempts without blocking it', async () => {
    repository.createNotification.mockResolvedValue({
      notification: notification(),
      createdNow: true,
    });
    repository.listActiveNotificationFcmTokens.mockResolvedValue([
      { token: 'fcm-token-1' },
      { token: 'fcm-token-2' },
    ]);
    fcmDelivery.sendToTokens.mockResolvedValue([
      { token: 'fcm-token-1', status: 'SENT' },
      {
        token: 'fcm-token-2',
        status: 'FAILED',
        errorCode: 'messaging/registration-token-not-registered',
      },
    ]);
    repository.recordNotificationDeliveryAttempt.mockResolvedValue({
      id: 'attempt-1',
    });

    const result = await new CreateNotificationUseCase(
      repository as never,
      fcmDelivery as never,
    ).execute({
      userId: 'user-1',
      notificationType: 'ORDER_FULFILLMENT',
      title: 'Don hang cap nhat',
      body: 'Don hang da duoc xu ly.',
      targetType: 'ORDER',
      targetId: 'order-1',
      dedupeKey: 'ORDER_FULFILLMENT:order-1:processed:user-1',
      eventName: 'notification.order.created.v1',
    });

    expect(repository.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        dedupeKey: 'ORDER_FULFILLMENT:order-1:processed:user-1',
      }),
    );
    expect(fcmDelivery.sendToTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['fcm-token-1', 'fcm-token-2'],
        title: 'Don hang cap nhat',
      }),
    );
    expect(repository.recordNotificationDeliveryAttempt).toHaveBeenCalledTimes(
      2,
    );
    expect(repository.recordNotificationDeliveryAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'FCM',
        status: 'FAILED',
        errorCode: 'messaging/registration-token-not-registered',
      }),
    );
    expect(result.id).toBe('notification-1');
    expect(result.createdNow).toBe(true);
  });

  it('does not redeliver an existing deduplicated notification', async () => {
    repository.createNotification.mockResolvedValue({
      notification: notification(),
      createdNow: false,
    });

    const result = await new CreateNotificationUseCase(
      repository as never,
      fcmDelivery as never,
    ).execute({
      userId: 'user-1',
      notificationType: 'LIVE_STARTED',
      title: 'Livestream da bat dau',
      body: 'Dang phat truc tiep.',
      targetType: 'LIVE_SESSION',
      targetId: 'live-1',
      dedupeKey: 'live-started:live-1:user-1',
    });

    expect(result.createdNow).toBe(false);
    expect(repository.listActiveNotificationFcmTokens).not.toHaveBeenCalled();
    expect(fcmDelivery.sendToTokens).not.toHaveBeenCalled();
    expect(repository.recordNotificationDeliveryAttempt).not.toHaveBeenCalled();
  });
});

function notification() {
  return {
    id: 'notification-1',
    userId: 'user-1',
    notificationType: 'ORDER_FULFILLMENT',
    title: 'Don hang cap nhat',
    body: 'Don hang da duoc xu ly.',
    targetType: 'ORDER',
    targetId: 'order-1',
    dedupeKey: 'ORDER_FULFILLMENT:order-1:processed:user-1',
    readAt: null,
    createdAt: new Date('2026-06-04T12:00:00.000Z'),
  };
}
