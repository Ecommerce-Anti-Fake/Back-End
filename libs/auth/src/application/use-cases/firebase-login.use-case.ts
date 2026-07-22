import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenPair } from '@contracts';
import { JwtTokenAdapter } from '../../infrastructure/adapters';
import {
  AuthSessionRepository,
  RegistrationRepository,
} from '../../infrastructure/persistence';
import { FirebaseLoginDto } from '../dto';
import {
  FirebaseTokenVerifierService,
  PasswordHasherService,
} from '../services';
import { toSafeUser } from './user.mapper';

@Injectable()
export class FirebaseLoginUseCase {
  constructor(
    private readonly registrationRepository: RegistrationRepository,
    private readonly authSessionRepository: AuthSessionRepository,
    private readonly passwordHasherService: PasswordHasherService,
    private readonly jwtTokenAdapter: JwtTokenAdapter,
    private readonly firebaseTokenVerifierService: FirebaseTokenVerifierService,
  ) {}

  async execute(dto: FirebaseLoginDto) {
    const token = await this.firebaseTokenVerifierService.verifyIdToken(
      dto.idToken,
    );
    if (
      token.signInProvider !== 'google.com' ||
      !token.email ||
      !token.emailVerified
    ) {
      throw new UnauthorizedException('A verified Google token is required');
    }

    const identity = await this.registrationRepository.findAuthIdentity(
      'GOOGLE',
      token.uid,
    );
    if (!identity) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'GOOGLE_ACCOUNT_NOT_LINKED',
        message: 'Tai khoan Google chua duoc dang ky hoac lien ket.',
      });
    }
    if (identity.user.accountStatus !== 'active') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'ACCOUNT_VERIFICATION_REQUIRED',
        message: 'Tai khoan Google chua hoan tat xac minh email.',
      });
    }

    const tokenPair = await this.issueSessionTokens(
      identity.user.id,
      identity.user.role,
    );
    return { ...tokenPair, user: toSafeUser(identity.user) };
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
