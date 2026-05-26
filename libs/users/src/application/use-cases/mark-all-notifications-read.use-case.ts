import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toNotificationResponse } from './notifications.mapper';

@Injectable()
export class MarkAllNotificationsReadUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(userId: string) {
    await this.usersRepository.markAllNotificationsRead(userId);
    const result = await this.usersRepository.listNotifications({ userId, page: 1, pageSize: 20 });

    return {
      total: result.total,
      unreadCount: result.unreadCount,
      page: result.page,
      pageSize: result.pageSize,
      items: result.items.map(toNotificationResponse),
    };
  }
}
