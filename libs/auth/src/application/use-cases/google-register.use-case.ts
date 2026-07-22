import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { RegistrationRepository } from '../../infrastructure/persistence';
import { GoogleRegisterDto } from '../dto';
import {
  FirebaseTokenVerifierService,
  PasswordHasherService,
} from '../services';
import { normalizeEmail } from './auth-identifier.mapper';

const REGISTRATION_TTL_MS = 24 * 60 * 60 * 1000;
const LINK_INTENT_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class GoogleRegisterUseCase {
  constructor(
    private readonly registrationRepository: RegistrationRepository,
    private readonly firebaseTokenVerifierService: FirebaseTokenVerifierService,
    private readonly passwordHasherService: PasswordHasherService,
  ) {}

  async execute(dto: GoogleRegisterDto) {
    const token = await this.firebaseTokenVerifierService.verifyIdToken(
      dto.idToken,
    );
    const email = normalizeEmail(token.email);
    if (
      token.signInProvider !== 'google.com' ||
      !email ||
      !token.emailVerified
    ) {
      throw new ForbiddenException('A verified Google token is required');
    }

    const identity = await this.registrationRepository.findAuthIdentity(
      'GOOGLE',
      token.uid,
    );
    if (identity) {
      if (identity.user.accountStatus === 'pending_verification') {
        return this.resumePending(
          identity.user.id,
          email,
          token.name?.trim() || null,
          identity.user.createdAt,
        );
      }
      throw codedConflict(
        'ACCOUNT_ALREADY_EXISTS',
        'Tai khoan Google da ton tai. Vui long dang nhap.',
      );
    }

    const existing = await this.registrationRepository.findUserByIdentifier({
      email,
      phone: null,
    });
    if (existing) {
      if (existing.accountStatus !== 'active') {
        throw codedConflict(
          'ACCOUNT_VERIFICATION_REQUIRED',
          'Tai khoan dang cho xac minh. Vui long hoan tat dang ky ban dau.',
        );
      }

      const secret = randomBytes(32).toString('base64url');
      const intent = await this.registrationRepository.createGoogleLinkIntent({
        userId: existing.id,
        providerSubject: token.uid,
        tokenHash: this.passwordHasherService.hashOpaqueToken(secret),
        expiresAt: new Date(Date.now() + LINK_INTENT_TTL_MS),
      });
      return {
        kind: 'LINK_REQUIRED' as const,
        linkToken: `${intent.id}.${secret}`,
        email,
        expiresAt: intent.expiresAt,
      };
    }

    const secret = randomBytes(32).toString('base64url');
    const sessionExpiresAt = new Date(Date.now() + REGISTRATION_TTL_MS);
    const { session } =
      await this.registrationRepository.createGoogleRegistration({
        email,
        displayName: token.name?.trim() || null,
        firebaseUid: token.uid,
        accountStatus: 'pending_verification',
        sessionProvider: 'GOOGLE',
        sessionPurpose: 'REGISTER',
        sessionTokenHash: this.passwordHasherService.hashOpaqueToken(secret),
        sessionExpiresAt,
      });
    return pendingResult(session.id, secret, email, session.expiresAt);
  }

  private async resumePending(
    userId: string,
    email: string,
    displayName: string | null,
    createdAt: Date,
  ) {
    const secret = randomBytes(32).toString('base64url');
    const originalExpiry = new Date(createdAt.getTime() + REGISTRATION_TTL_MS);
    if (originalExpiry.getTime() <= Date.now()) {
      const { session } =
        await this.registrationRepository.replaceExpiredGoogleRegistration({
          userId,
          email,
          displayName,
          sessionTokenHash: this.passwordHasherService.hashOpaqueToken(secret),
          sessionExpiresAt: new Date(Date.now() + REGISTRATION_TTL_MS),
        });
      return pendingResult(session.id, secret, email, session.expiresAt);
    }

    const session = await this.registrationRepository.createRegistrationSession(
      {
        userId,
        provider: 'GOOGLE',
        purpose: 'REGISTER',
        tokenHash: this.passwordHasherService.hashOpaqueToken(secret),
        expiresAt: originalExpiry,
      },
    );
    return pendingResult(session.id, secret, email, session.expiresAt);
  }
}

function pendingResult(
  sessionId: string,
  secret: string,
  email: string,
  expiresAt: Date,
) {
  return {
    kind: 'PENDING_VERIFICATION' as const,
    registrationToken: `${sessionId}.${secret}`,
    registration: {
      provider: 'GOOGLE' as const,
      email,
      phone: null,
      expiresAt,
    },
  };
}

function codedConflict(error: string, message: string) {
  return new ConflictException({ statusCode: 409, error, message });
}
