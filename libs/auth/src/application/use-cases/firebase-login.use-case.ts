import {
  ConflictException,
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
import {
  normalizeEmail,
  normalizePhone,
  normalizePhoneE164,
} from './auth-identifier.mapper';
import { toSafeUser } from './user.mapper';

const FIREBASE_PASSWORD_PROVIDERS = new Set(['password', 'phone']);

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

    if (token.signInProvider === 'google.com') {
      const email = normalizeEmail(token.email);
      if (!email || token.emailVerified !== true) {
        throw new ForbiddenException('A verified Google token is required');
      }

      const user = await this.registrationRepository.createOrLinkGoogleUser({
        email,
        displayName: token.name?.trim() || null,
        firebaseUid: token.uid,
      });
      return this.issueAuthenticatedResponse(user);
    }
    if (!FIREBASE_PASSWORD_PROVIDERS.has(token.signInProvider ?? '')) {
      throw new UnauthorizedException('Unsupported Firebase login provider');
    }

    const identity = await this.registrationRepository.findAuthIdentity(
      'FIREBASE',
      token.uid,
    );
    if (identity) {
      return this.issueAuthenticatedResponse(identity.user);
    }

    const pending =
      await this.registrationRepository.findPendingRegistrationByFirebaseUid(
        token.uid,
      );
    if (!pending || pending.completedAt) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'FIREBASE_ACCOUNT_NOT_LINKED',
        message: 'Firebase user chua duoc dang ky voi AntiFake.',
      });
    }

    if (token.uid !== pending.firebaseUid) {
      throw new ForbiddenException(
        'Firebase identity does not match registration',
      );
    }
    if (pending.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException({
        statusCode: 409,
        error: 'REGISTRATION_EXPIRED',
        message: 'Phien dang ky da het han. Vui long dang ky lai.',
      });
    }

    const emailVerified =
      token.emailVerified === true &&
      normalizeEmail(token.email) === pending.email;
    const phoneVerified =
      Boolean(token.phoneNumber) &&
      normalizePhoneE164(token.phoneNumber) === pending.phone;

    if (!emailVerified && !phoneVerified) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'ACCOUNT_VERIFICATION_REQUIRED',
        message: 'Vui long xac minh email hoac so dien thoai.',
        registration: {
          provider: 'LOCAL',
          email: pending.email,
          phone: pending.phone,
          expiresAt: pending.expiresAt,
        },
      });
    }

    let user: Parameters<typeof toSafeUser>[0];
    try {
      user = await this.registrationRepository.promotePendingRegistration({
        pendingId: pending.id,
        firebaseUid: token.uid,
        email: pending.email,
        phone: normalizePhone(pending.phone)!,
        displayName: pending.displayName,
        emailVerifiedAt: emailVerified ? new Date() : null,
        phoneVerifiedAt: phoneVerified ? new Date() : null,
      });
    } catch (error) {
      const racedIdentity = await this.registrationRepository.findAuthIdentity(
        'FIREBASE',
        token.uid,
      );
      if (
        !racedIdentity ||
        normalizeEmail(racedIdentity.user.email ?? undefined) !==
          pending.email ||
        normalizePhone(racedIdentity.user.phone ?? undefined) !==
          normalizePhone(pending.phone)
      ) {
        throw error;
      }
      user = racedIdentity.user;
    }

    return this.issueAuthenticatedResponse(user);
  }

  private async issueAuthenticatedResponse(
    user: Parameters<typeof toSafeUser>[0],
  ) {
    if (user.accountStatus !== 'active') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'ACCOUNT_NOT_ACTIVE',
        message: 'Tai khoan chua o trang thai hoat dong.',
      });
    }
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
