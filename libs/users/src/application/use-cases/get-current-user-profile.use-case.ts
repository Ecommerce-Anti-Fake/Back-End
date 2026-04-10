import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserSummary } from '../../domain/interfaces/user.types';
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

    return this.toUserSummary(user);
  }

  private toUserSummary(user: UserSummary): UserSummary {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      role: user.role,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
