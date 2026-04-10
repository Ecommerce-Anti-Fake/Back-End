import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RefreshTokenDto } from '../dto';
import { JwtTokenAdapter } from '../../infrastructure/adapters';
import { AuthSessionRepository } from '../../infrastructure/persistence';
import { PasswordHasherService } from '../services';

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly passwordHasherService: PasswordHasherService,
    private readonly jwtTokenAdapter: JwtTokenAdapter,
  ) {}

  async execute(dto: RefreshTokenDto) {
    const payload = await this.jwtTokenAdapter.verifyRefreshToken(dto.refreshToken);
    if (payload.typ !== 'refresh' || !payload.sid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.authSessionRepository.findSessionOnlyById(payload.sid);
    if (!session) {
      return { loggedOut: true };
    }

    const matchesCurrentToken =
      session.currentTokenId === payload.jti &&
      this.passwordHasherService.verifyHashedValue(dto.refreshToken, session.currentTokenHash);

    if (!matchesCurrentToken) {
      await this.authSessionRepository.update(session.id, {
        revokedAt: session.revokedAt ?? new Date(),
        reuseDetectedAt: new Date(),
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    await this.authSessionRepository.update(session.id, {
      revokedAt: new Date(),
    });
    return { loggedOut: true };
  }
}
