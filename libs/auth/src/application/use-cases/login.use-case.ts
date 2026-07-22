import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from '../dto';
import { TokenPair, UserIdentityPort } from '@contracts';
import { JwtTokenAdapter } from '../../infrastructure/adapters';
import { AuthSessionRepository } from '../../infrastructure/persistence';
import { PasswordHasherService } from '../services';
import { toLoginIdentifier } from './auth-identifier.mapper';
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
    const username = dto.username?.trim();
    const password = dto.password;

    if (!username || !password) {
      throw new BadRequestException('Username and password are required');
    }

    const user = await this.validateUser(username, password);

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
    const identifier = toLoginIdentifier(username);

    const user = await this.userIdentityPort.findByIdentifier(identifier);

    if (!user || !user.password) {
      return null;
    }

    const isValid = await this.passwordHasherService.verifyPassword(
      password,
      user.password,
    );

    if (!isValid) {
      return null;
    }
    if (user.accountStatus === 'pending_verification') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'ACCOUNT_VERIFICATION_REQUIRED',
        message: 'Tai khoan chua hoan tat xac minh.',
      });
    }
    if (user.accountStatus !== 'active') {
      throw new ForbiddenException('Account is not active');
    }
    if (identifier.email && user.emailVerifiedAt === null) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Email chua duoc xac minh.',
      });
    }
    if (identifier.phone && user.phoneVerifiedAt === null) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'PHONE_NOT_VERIFIED',
        message: 'So dien thoai chua duoc xac minh.',
      });
    }

    return user;
  }

  private async issueSessionTokens(
    userId: string,
    role: string,
  ): Promise<TokenPair> {
    const accessToken = await this.jwtTokenAdapter.generateAccessToken(
      userId,
      role,
    );
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
      currentTokenHash:
        this.passwordHasherService.hashOpaqueToken(refreshToken),
    });

    return { accessToken, refreshToken };
  }
}
