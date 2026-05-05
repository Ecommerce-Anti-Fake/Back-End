import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toUserSummary } from './users.mapper';

@Injectable()
export class GetUserByIdUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(id: string) {
    const user = await this.usersRepository.findUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const defaultAddress = await this.usersRepository.findDefaultAddressByUserId(id);
    return toUserSummary(user, defaultAddress);
  }
}
