import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RefreshTokenDto } from '../dto';
import { TokenPair } from '@contracts';
import { JwtTokenAdapter } from '../../infrastructure/adapters';
import { AuthSessionRepository } from '../../infrastructure/persistence';
import { PasswordHasherService } from '../services';
import { toSafeUser } from './user.mapper';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly passwordHasherService: PasswordHasherService,
    private readonly jwtTokenAdapter: JwtTokenAdapter,
  ) {}

  async execute(dto: RefreshTokenDto) {
    const payload = await this.jwtTokenAdapter.verifyRefreshToken(dto.refreshToken);
    if (payload.typ !== 'refresh' || !payload.sid || !payload.jti || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.authSessionRepository.findById(payload.sid);
    if (!session || !session.user) {
      throw new UnauthorizedException('Refresh session not found');
    }
    if (session.revokedAt) {
      throw new UnauthorizedException('Refresh session has been revoked');
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Refresh session has expired');
    }
    if (session.user.accountStatus !== 'active') {
      await this.revokeSession(session.id);
      throw new ForbiddenException('Account is not active');
    }

    const matchesCurrentToken =
      session.currentTokenId === payload.jti &&
      this.passwordHasherService.verifyHashedValue(dto.refreshToken, session.currentTokenHash);

    if (!matchesCurrentToken) {
      await this.authSessionRepository.update(session.id, {
        revokedAt: new Date(),
        reuseDetectedAt: new Date(),
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const tokens = await this.rotateRefreshToken(session.id, session.user.id, session.user.role);
    return {
      ...tokens,
      user: toSafeUser(session.user),
    };
  }

  private async rotateRefreshToken(
    sessionId: string,
    userId: string,
    role: string,
  ): Promise<TokenPair> {
    const accessToken = await this.jwtTokenAdapter.generateAccessToken(userId, role);
    const nextTokenId = this.jwtTokenAdapter.generateTokenId();
    const refreshToken = await this.jwtTokenAdapter.generateRefreshToken(
      userId,
      sessionId,
      nextTokenId,
    );

    await this.authSessionRepository.update(sessionId, {
      currentTokenId: nextTokenId,
      currentTokenHash: this.passwordHasherService.hashOpaqueToken(refreshToken),
      expiresAt: this.jwtTokenAdapter.calculateRefreshExpiry(),
      lastUsedAt: new Date(),
    });

    return { accessToken, refreshToken };
  }

  private async revokeSession(sessionId: string) {
    await this.authSessionRepository.update(sessionId, {
      revokedAt: new Date(),
    });
  }

}
