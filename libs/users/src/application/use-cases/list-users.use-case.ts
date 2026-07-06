import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toAdminUserListItem } from './users.mapper';

type ListUsersInput = {
  role?: 'user';
  status?: 'all' | 'active' | 'inactive' | 'blocked' | 'banned';
  page?: number;
  pageSize?: number;
};

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(input: ListUsersInput = {}) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 10;
    const result = await this.usersRepository.listForAdmin({
      role: input.role ?? 'user',
      status: input.status ?? 'all',
      page,
      pageSize,
    });

    return {
      page,
      pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / pageSize),
      totalUser: result.totalUser,
      totalShop: result.totalShop,
      activeUser: result.activeUser,
      bannedUser: result.bannedUser,
      items: result.items.map((user) => toAdminUserListItem(user)),
    };
  }
}
