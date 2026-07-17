import { BadRequestException, Injectable } from '@nestjs/common';
import { UserIdentityPort } from '@contracts';
import { AuthSessionRepository, PasswordResetTokenRepository } from '../../infrastructure/persistence';
import { ResetPasswordDto } from '../dto';
import { PasswordHasherService } from '../services';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly userIdentityPort: UserIdentityPort,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly passwordHasherService: PasswordHasherService,
  ) {}

  async execute(dto: ResetPasswordDto) {
    const { tokenId, rawToken } = this.parseToken(dto.token);
    const resetToken = await this.passwordResetTokenRepository.findById(tokenId);
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Password reset token is invalid or expired');
    }

    if (!this.passwordHasherService.verifyHashedValue(rawToken, resetToken.tokenHash)) {
      throw new BadRequestException('Password reset token is invalid or expired');
    }

    const passwordHash = await this.passwordHasherService.hashPassword(dto.newPassword);
    await this.userIdentityPort.updatePassword(resetToken.userId, passwordHash);
    await this.passwordResetTokenRepository.markUsed(resetToken.id);
    await this.authSessionRepository.revokeActiveSessionsForUser(resetToken.userId);

    return { message: 'Cập nhật mật khẩu thành công.' };
  }

  private parseToken(token: string) {
    const [tokenId, rawToken] = token.trim().split('.');
    if (!tokenId || !rawToken) {
      throw new BadRequestException('Password reset token is invalid or expired');
    }

    return { tokenId, rawToken };
  }
}
