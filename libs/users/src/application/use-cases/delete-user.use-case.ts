import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toUserSummary } from './users.mapper';

@Injectable()
export class DeleteUserUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(id: string) {
    const current = await this.usersRepository.findUserById(id);
    if (!current) {
      throw new NotFoundException('User not found');
    }

    const user = await this.usersRepository.updateUser(id, {
      accountStatus: 'inactive',
    });

    return toUserSummary(user);
  }
}
