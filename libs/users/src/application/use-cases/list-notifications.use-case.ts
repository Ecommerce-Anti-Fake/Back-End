import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toNotificationResponse } from './notifications.mapper';

@Injectable()
export class ListNotificationsUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(input: { userId: string; filter?: 'unread' | 'readed'; page?: number; pageSize?: number }) {
    const result = await this.usersRepository.listNotifications(input);

    return {
      total: result.total,
      unreadCount: result.unreadCount,
      page: result.page,
      pageSize: result.pageSize,
      items: result.items.map(toNotificationResponse),
    };
  }
}
