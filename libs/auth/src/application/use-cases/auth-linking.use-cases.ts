import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { RegistrationRepository } from '../../infrastructure/persistence';
import { SetLocalCredentialsDto } from '../dto';
import {
  FirebaseTokenVerifierService,
  PasswordHasherService,
} from '../services';
import { normalizePhone } from './auth-identifier.mapper';

const REGISTRATION_TTL_MS = 24 * 60 * 60 * 1000;
const FRESH_GOOGLE_PROOF_SECONDS = 5 * 60;

@Injectable()
export class ConfirmGoogleLinkUseCase {
  constructor(
    private readonly registrationRepository: RegistrationRepository,
    private readonly passwordHasherService: PasswordHasherService,
  ) {}

  async execute(userId: string, linkToken: string) {
    const parsed = parseOpaqueToken(linkToken);
    const intent = await this.registrationRepository.findGoogleLinkIntentById(
      parsed.id,
    );
    if (
      !intent ||
      intent.userId !== userId ||
      intent.usedAt ||
      intent.expiresAt.getTime() <= Date.now() ||
      !this.passwordHasherService.verifyHashedValue(
        parsed.secret,
        intent.tokenHash,
      )
    ) {
      throw new UnauthorizedException('Invalid Google link intent');
    }
    if (intent.user.accountStatus !== 'active') {
      throw new ForbiddenException('Account is not active');
    }

    if (intent.user.emailVerifiedAt) {
      await this.registrationRepository.completeGoogleLink(intent.id);
      return { success: true, message: 'Lien ket Google thanh cong.' };
    }

    const secret = randomBytes(32).toString('base64url');
    const session = await this.registrationRepository.createRegistrationSession(
      {
        userId,
        provider: 'GOOGLE',
        purpose: 'LINK_GOOGLE',
        pendingProviderSubject: intent.providerSubject,
        tokenHash: this.passwordHasherService.hashOpaqueToken(secret),
        expiresAt: new Date(Date.now() + REGISTRATION_TTL_MS),
        consumeLinkIntentId: intent.id,
      },
    );
    return {
      success: false,
      verificationRequired: true,
      registrationToken: `${session.id}.${secret}`,
      registration: {
        provider: 'GOOGLE' as const,
        email: intent.user.email,
        phone: intent.user.phone,
        expiresAt: session.expiresAt,
      },
    };
  }
}

@Injectable()
export class SetLocalCredentialsUseCase {
  constructor(
    private readonly registrationRepository: RegistrationRepository,
    private readonly passwordHasherService: PasswordHasherService,
    private readonly firebaseTokenVerifierService: FirebaseTokenVerifierService,
  ) {}

  async execute(userId: string, dto: SetLocalCredentialsDto) {
    const token = await this.firebaseTokenVerifierService.verifyIdToken(
      dto.idToken,
    );
    const nowSeconds = Math.floor(Date.now() / 1000);
    const identity = await this.registrationRepository.findAuthIdentity(
      'GOOGLE',
      token.uid,
    );
    if (
      token.signInProvider !== 'google.com' ||
      !token.emailVerified ||
      !token.authTime ||
      token.authTime < nowSeconds - FRESH_GOOGLE_PROOF_SECONDS ||
      token.authTime > nowSeconds + 30 ||
      !identity ||
      identity.userId !== userId ||
      identity.user.accountStatus !== 'active'
    ) {
      throw new ForbiddenException(
        'Fresh Google proof does not match the current user',
      );
    }

    const phone = normalizePhone(dto.phone);
    if (!phone || !/^0\d{9}$/.test(phone)) {
      throw new ForbiddenException('Phone number is invalid');
    }
    const owner = await this.registrationRepository.findUserByIdentifier({
      email: null,
      phone,
    });
    if (owner && owner.id !== userId) {
      throw new ConflictException('Phone number is already in use');
    }

    const secret = randomBytes(32).toString('base64url');
    const password = await this.passwordHasherService.hashPassword(
      dto.password,
    );
    const sessionExpiresAt = new Date(Date.now() + REGISTRATION_TTL_MS);
    const { session } = await this.registrationRepository.setLocalCredentials({
      userId,
      phone,
      password,
      sessionTokenHash: this.passwordHasherService.hashOpaqueToken(secret),
      sessionExpiresAt,
    });
    return {
      registrationToken: `${session.id}.${secret}`,
      registration: {
        provider: 'LOCAL' as const,
        purpose: 'VERIFY_PHONE' as const,
        email: identity.user.email,
        phone,
        expiresAt: session.expiresAt,
      },
    };
  }
}

function parseOpaqueToken(rawToken: string) {
  const separator = rawToken.indexOf('.');
  const id = rawToken.slice(0, separator);
  const secret = rawToken.slice(separator + 1);
  if (separator <= 0 || !id || !secret) {
    throw new UnauthorizedException('Invalid opaque token');
  }
  return { id, secret };
}
