import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { toUserSummary} from './users.mapper';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';

@Injectable()
export class GetCurrentUserProfileUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.accountStatus !== 'active') {
      throw new ForbiddenException('Account is not active');
    }

    return toUserSummary(user);
  }

}
