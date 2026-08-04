import { ListNotificationsUseCase } from './list-notifications.use-case';
import { MarkNotificationReadUseCase } from './mark-notification-read.use-case';

describe('Notification use cases', () => {
  const repository = {
    listNotifications: jest.fn(),
    markNotificationRead: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists notifications with unread count', async () => {
    repository.listNotifications.mockResolvedValue({
      total: 1,
      unreadCount: 1,
      unreadChatCount: 1,
      page: 1,
      pageSize: 20,
      items: [notification()],
    });

    const result = await new ListNotificationsUseCase(repository as never).execute({
      userId: 'user-1',
      filter: 'unread',
    });

    expect(repository.listNotifications).toHaveBeenCalledWith({
      userId: 'user-1',
      filter: 'unread',
    });
    expect(result.unreadCount).toBe(1);
    expect(result.unreadChatCount).toBe(1);
    expect(result.items[0].targetType).toBe('CHAT_THREAD');
  });

  it('marks a notification read for its owner', async () => {
    repository.markNotificationRead.mockResolvedValue(notification({ readAt: new Date('2026-05-26T10:00:00.000Z') }));

    const result = await new MarkNotificationReadUseCase(repository as never).execute({
      userId: 'user-1',
      notificationId: 'notification-1',
    });

    expect(repository.markNotificationRead).toHaveBeenCalledWith('user-1', 'notification-1');
    expect(result.readAt).toEqual(new Date('2026-05-26T10:00:00.000Z'));
  });
});

function notification(input: { readAt?: Date | null } = {}) {
  return {
    id: 'notification-1',
    userId: 'user-1',
    notificationType: 'CHAT_MESSAGE',
    title: 'Tin nhan moi',
    body: 'Shop vua gui tin nhan.',
    targetType: 'CHAT_THREAD',
    targetId: 'thread-1',
    dedupeKey: 'CHAT_MESSAGE:message-1:user-1',
    readAt: input.readAt ?? null,
    createdAt: new Date('2026-05-26T09:00:00.000Z'),
  };
}
