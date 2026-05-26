import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toNotificationResponse } from './notifications.mapper';

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(input: { userId: string; notificationId: string }) {
    const notification = await this.usersRepository.markNotificationRead(input.userId, input.notificationId);
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return toNotificationResponse(notification);
  }
}
