import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toUserSummary } from './users.mapper';

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(role?: 'user') {
    const users = await this.usersRepository.findAll(role ?? 'user');
    return users.map((user) => toUserSummary(user));
  }
}
