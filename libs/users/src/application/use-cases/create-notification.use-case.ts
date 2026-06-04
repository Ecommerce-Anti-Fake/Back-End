import { Injectable } from '@nestjs/common';
import { FirebaseNotificationDeliveryService } from '../services/firebase-notification-delivery.service';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toNotificationResponse } from './notifications.mapper';

@Injectable()
export class CreateNotificationUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly firebaseNotificationDeliveryService: FirebaseNotificationDeliveryService,
  ) {}

  async execute(input: {
    userId: string;
    notificationType: string;
    title: string;
    body: string;
    targetType?: string | null;
    targetId?: string | null;
    dedupeKey: string;
    eventName?: string | null;
  }) {
    const notification = await this.usersRepository.createNotification(input);
    const eventName = input.eventName?.trim() || 'notification.created.v1';
    const tokens = await this.usersRepository.listActiveNotificationFcmTokens(input.userId);

    const fcmResults = await this.firebaseNotificationDeliveryService.sendToTokens({
      tokens: tokens.map((token) => token.token),
      title: input.title,
      body: input.body,
      data: {
        notificationId: notification.id,
        notificationType: input.notificationType,
        targetType: input.targetType ?? '',
        targetId: input.targetId ?? '',
      },
    });

    await Promise.all(
      fcmResults.map((result) =>
        this.usersRepository.recordNotificationDeliveryAttempt({
          userId: input.userId,
          notificationId: notification.id,
          eventName,
          provider: 'FCM',
          status: result.status,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
        }),
      ),
    );

    return toNotificationResponse(notification);
  }
}
