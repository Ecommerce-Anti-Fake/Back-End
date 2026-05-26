import { Notification } from '@prisma/client';

export function toNotificationResponse(notification: Notification) {
  return {
    id: notification.id,
    userId: notification.userId,
    notificationType: notification.notificationType,
    title: notification.title,
    body: notification.body,
    targetType: notification.targetType,
    targetId: notification.targetId,
    dedupeKey: notification.dedupeKey,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}
