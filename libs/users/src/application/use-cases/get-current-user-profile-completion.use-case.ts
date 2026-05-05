import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toUserProfileCompletion } from './users.mapper';

@Injectable()
export class GetCurrentUserProfileCompletionUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.accountStatus !== 'active') {
      throw new ForbiddenException('Account is not active');
    }

    const defaultAddress = await this.usersRepository.findDefaultAddressByUserId(userId);
    return toUserProfileCompletion(user, defaultAddress);
  }
}
