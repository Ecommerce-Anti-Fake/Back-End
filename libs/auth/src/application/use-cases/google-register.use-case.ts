import { ForbiddenException, Injectable } from '@nestjs/common';
import { TokenPair } from '@contracts';
import {
  AuthSessionRepository,
  RegistrationRepository,
} from '../../infrastructure/persistence';
import { JwtTokenAdapter } from '../../infrastructure/adapters';
import { GoogleRegisterDto } from '../dto';
import {
  FirebaseTokenVerifierService,
  PasswordHasherService,
} from '../services';
import { normalizeEmail } from './auth-identifier.mapper';
import { toSafeUser } from './user.mapper';

@Injectable()
export class GoogleRegisterUseCase {
  constructor(
    private readonly registrationRepository: RegistrationRepository,
    private readonly firebaseTokenVerifierService: FirebaseTokenVerifierService,
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly passwordHasherService: PasswordHasherService,
    private readonly jwtTokenAdapter: JwtTokenAdapter,
  ) {}

  async execute(dto: GoogleRegisterDto) {
    const token = await this.firebaseTokenVerifierService.verifyIdToken(
      dto.idToken,
    );
    const email = normalizeEmail(token.email);
    if (
      token.signInProvider !== 'google.com' ||
      !email ||
      token.emailVerified !== true
    ) {
      throw new ForbiddenException('A verified Google token is required');
    }

    const user = await this.registrationRepository.createOrLinkGoogleUser({
      email,
      displayName: token.name?.trim() || null,
      firebaseUid: token.uid,
    });
    const tokenPair = await this.issueSessionTokens(user.id, user.role);
    return { ...tokenPair, user: toSafeUser(user) };
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
