import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { UserIdentityPort } from '@contracts';
import { PasswordResetTokenRepository } from '../../infrastructure/persistence';
import { ForgotPasswordDto } from '../dto';
import { PasswordHasherService } from '../services';

const GENERIC_RESET_MESSAGE = 'Nếu tài khoản tồn tại, yêu cầu đặt lại mật khẩu đã được tạo.';

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    private readonly userIdentityPort: UserIdentityPort,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly passwordHasherService: PasswordHasherService,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: ForgotPasswordDto) {
    const identifier = dto.identifier.trim();
    const user = this.isEmail(identifier)
      ? await this.userIdentityPort.findByIdentifier({ email: identifier.toLowerCase() })
      : await this.userIdentityPort.findByIdentifier({ phone: identifier });

    if (!user || user.accountStatus !== 'active' || !user.password) {
      return { message: GENERIC_RESET_MESSAGE };
    }

    await this.passwordResetTokenRepository.expireOpenTokensForUser(user.id);
    const rawToken = randomBytes(32).toString('hex');
    const token = await this.passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash: this.passwordHasherService.hashOpaqueToken(rawToken),
      expiresAt: this.calculateExpiry(),
    });

    const response: { message: string; resetToken?: string } = { message: GENERIC_RESET_MESSAGE };
    if (this.configService.get<string>('PASSWORD_RESET_RETURN_TOKEN')?.trim() === 'true') {
      response.resetToken = `${token.id}.${rawToken}`;
    }

    return response;
  }

  private calculateExpiry() {
    const ttlMinutes = Number(this.configService.get<string>('PASSWORD_RESET_TTL_MINUTES')?.trim() || 30);
    const safeTtlMinutes = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? ttlMinutes : 30;
    return new Date(Date.now() + safeTtlMinutes * 60 * 1000);
  }

  private isEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}
