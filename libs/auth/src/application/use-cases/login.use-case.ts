import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from '../dto';
import { TokenPair, UserIdentityPort } from '@contracts';
import { JwtTokenAdapter } from '../../infrastructure/adapters';
import { AuthSessionRepository } from '../../infrastructure/persistence';
import { PasswordHasherService } from '../services';
import { toSafeUser } from './user.mapper';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userIdentityPort: UserIdentityPort,
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly passwordHasherService: PasswordHasherService,
    private readonly jwtTokenAdapter: JwtTokenAdapter,
  ) {}

  async execute(dto: LoginDto) {
    const user = await this.validateUser(dto.username, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokenPair = await this.issueSessionTokens(user.id, user.role);
    return {
      ...tokenPair,
      user: toSafeUser(user),
    };
  }

  private async validateUser(username: string, password: string) {
    const identifier = username.trim();
    const user = this.isEmail(identifier)
      ? await this.userIdentityPort.findByIdentifier({
          email: this.normalizeEmail(identifier),
        })
      : await this.userIdentityPort.findByIdentifier({
          phone: this.normalizePhone(identifier),
        });

    if (!user || !user.password) {
      return null;
    }
    if (user.accountStatus !== 'active') {
      throw new ForbiddenException('Account is not active');
    }

    const isValid = await this.passwordHasherService.verifyPassword(password, user.password);
    return isValid ? user : null;
  }

  private async issueSessionTokens(userId: string, role: string): Promise<TokenPair> {
    const accessToken = await this.jwtTokenAdapter.generateAccessToken(userId, role);
    const refreshTokenId = this.jwtTokenAdapter.generateTokenId();
    const session = await this.authSessionRepository.create({
      userId,
      tokenFamily: this.jwtTokenAdapter.generateTokenId(),
      currentTokenId: refreshTokenId,
      currentTokenHash: '',
      expiresAt: this.jwtTokenAdapter.calculateRefreshExpiry(),
    });
    const refreshToken = await this.jwtTokenAdapter.generateRefreshToken(
      userId,
      session.id,
      refreshTokenId,
    );

    await this.authSessionRepository.update(session.id, {
      currentTokenHash: this.passwordHasherService.hashOpaqueToken(refreshToken),
    });

    return { accessToken, refreshToken };
  }

  private normalizeEmail(email?: string): string | null {
    const normalized = email?.trim().toLowerCase();
    return normalized || null;
  }

  private normalizePhone(phone?: string): string | null {
    const normalized = phone?.trim();
    return normalized || null;
  }

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}
