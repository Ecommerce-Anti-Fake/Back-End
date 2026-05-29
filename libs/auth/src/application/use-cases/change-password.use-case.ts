import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserIdentityPort } from '@contracts';
import { AuthSessionRepository } from '../../infrastructure/persistence';
import { ChangePasswordDto } from '../dto';
import { PasswordHasherService } from '../services';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly userIdentityPort: UserIdentityPort,
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly passwordHasherService: PasswordHasherService,
  ) {}

  async execute(userId: string, dto: ChangePasswordDto) {
    const user = await this.userIdentityPort.findById(userId);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.accountStatus !== 'active') {
      throw new ForbiddenException('Account is not active');
    }

    const isCurrentPasswordValid = await this.passwordHasherService.verifyPassword(dto.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordHash = await this.passwordHasherService.hashPassword(dto.newPassword);
    await this.userIdentityPort.updatePassword(user.id, passwordHash);
    await this.authSessionRepository.revokeActiveSessionsForUser(user.id);

    return { message: 'Password updated successfully.' };
  }
}
