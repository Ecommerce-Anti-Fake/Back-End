import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TokenPair, UserIdentityPort, type UserIdentityRecord } from '@contracts';
import { JwtTokenAdapter } from '../../infrastructure/adapters';
import { AuthSessionRepository } from '../../infrastructure/persistence';
import { FirebaseLoginDto } from '../dto';
import { FirebaseTokenVerifierService } from '../services';
import { PasswordHasherService } from '../services';
import { toSafeUser } from './user.mapper';

@Injectable()
export class FirebaseLoginUseCase {
  constructor(
    private readonly userIdentityPort: UserIdentityPort,
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly passwordHasherService: PasswordHasherService,
    private readonly jwtTokenAdapter: JwtTokenAdapter,
    private readonly firebaseTokenVerifierService: FirebaseTokenVerifierService,
  ) {}

  async execute(dto: FirebaseLoginDto) {
    const token = await this.firebaseTokenVerifierService.verifyIdToken(dto.idToken);
    const email = this.normalizeEmail(token.email);
    const phone = this.normalizePhone(token.phoneNumber);

    if (!email && !phone) {
      throw new UnauthorizedException('Firebase token does not contain a verified identifier');
    }

    if (email && !token.emailVerified && !phone) {
      throw new ForbiddenException('Email is not verified');
    }

    const existing = await this.userIdentityPort.findByIdentifier({ email, phone });
    const user = existing ?? (await this.createFirebaseUser({ email, phone, displayName: dto.displayName || token.name }));

    if (user.accountStatus !== 'active') {
      throw new ForbiddenException('Account is not active');
    }

    const tokenPair = await this.issueSessionTokens(user.id, user.role);
    return {
      ...tokenPair,
      user: toSafeUser(user),
    };
  }

  private async createFirebaseUser(input: {
    email: string | null;
    phone: string | null;
    displayName?: string | null;
  }): Promise<UserIdentityRecord> {
    if (!input.email && !input.phone) {
      throw new BadRequestException('Either email or phone must be provided');
    }

    const randomPasswordHash = await this.passwordHasherService.hashPassword(randomUUID());
    return this.userIdentityPort.create({
      email: input.email,
      phone: input.phone,
      displayName: input.displayName?.trim() || null,
      password: randomPasswordHash,
    });
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
    const refreshToken = await this.jwtTokenAdapter.generateRefreshToken(userId, session.id, refreshTokenId);

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
}
