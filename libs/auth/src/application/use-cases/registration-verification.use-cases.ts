import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { RegistrationRepository } from '../../infrastructure/persistence';
import {
  FirebaseTokenVerifierService,
  PasswordHasherService,
} from '../services';
import { normalizeEmail, normalizePhone } from './auth-identifier.mapper';

type VerificationChannel = 'EMAIL' | 'PHONE';
type RegistrationSessionRecord = NonNullable<
  Awaited<ReturnType<RegistrationRepository['findRegistrationSessionById']>>
>;

const PHONE_TTL_MS = 3 * 60 * 1000;
const EMAIL_TTL_MS = 15 * 60 * 1000;
const EMAIL_RESEND_COOLDOWN_MS = 60 * 1000;
const VERIFICATION_SEND_WINDOW_MS = 60 * 60 * 1000;
const VERIFICATION_SEND_LIMIT = 5;

@Injectable()
export class CreateRegistrationChallengeUseCase {
  constructor(
    private readonly registrationRepository: RegistrationRepository,
    private readonly passwordHasherService: PasswordHasherService,
  ) {}

  async execute(
    registrationToken: string,
    dto: { channel: VerificationChannel },
  ) {
    const session = await resolveRegistrationSession(
      registrationToken,
      this.registrationRepository,
      this.passwordHasherService,
    );
    if (session.provider === 'GOOGLE' && dto.channel !== 'EMAIL') {
      throw new BadRequestException(
        'Google registration must be verified by email',
      );
    }

    const existing = await this.registrationRepository.findPendingChallenge(
      session.id,
    );
    if (existing && existing.expiresAt.getTime() > Date.now()) {
      throw codedConflict(
        'VERIFICATION_CHALLENGE_ACTIVE',
        'Mot ma xac minh van con hieu luc.',
      );
    }

    await assertVerificationSendLimit(
      this.registrationRepository,
      session.userId,
      dto.channel,
    );

    return this.create(session, dto.channel);
  }

  private async create(
    session: RegistrationSessionRecord,
    channel: VerificationChannel,
  ) {
    const stateSecret =
      channel === 'EMAIL' ? randomBytes(32).toString('base64url') : null;
    const expiresAt = new Date(Date.now() + ttlFor(channel));
    const challenge = await this.registrationRepository.createChallenge({
      sessionId: session.id,
      channel,
      stateTokenHash: stateSecret
        ? this.passwordHasherService.hashOpaqueToken(stateSecret)
        : null,
      expiresAt,
    });

    return {
      challenge: {
        id: challenge.id,
        channel,
        expiresAt: challenge.expiresAt,
        resendAt:
          channel === 'PHONE'
            ? challenge.expiresAt
            : new Date(
                challenge.createdAt.getTime() + EMAIL_RESEND_COOLDOWN_MS,
              ),
        ...(stateSecret ? { state: `${challenge.id}.${stateSecret}` } : {}),
      },
    };
  }
}

@Injectable()
export class ResendRegistrationChallengeUseCase {
  constructor(
    private readonly registrationRepository: RegistrationRepository,
    private readonly passwordHasherService: PasswordHasherService,
  ) {}

  async execute(registrationToken: string, challengeId: string) {
    const session = await resolveRegistrationSession(
      registrationToken,
      this.registrationRepository,
      this.passwordHasherService,
    );
    const previous =
      await this.registrationRepository.findChallengeById(challengeId);
    if (
      !previous ||
      previous.sessionId !== session.id ||
      previous.status !== 'PENDING'
    ) {
      throw new BadRequestException('Verification challenge is invalid');
    }

    const resendAt =
      previous.channel === 'PHONE'
        ? previous.expiresAt
        : new Date(previous.createdAt.getTime() + EMAIL_RESEND_COOLDOWN_MS);
    if (Date.now() < resendAt.getTime()) {
      throw codedConflict(
        'RESEND_NOT_AVAILABLE',
        'Chua the gui lai ma xac minh.',
      );
    }

    const channel = previous.channel as VerificationChannel;
    await assertVerificationSendLimit(
      this.registrationRepository,
      session.userId,
      channel,
    );
    const stateSecret =
      channel === 'EMAIL' ? randomBytes(32).toString('base64url') : null;
    const challenge =
      await this.registrationRepository.supersedeChallengeAndCreate(
        previous.id,
        {
          sessionId: session.id,
          channel,
          stateTokenHash: stateSecret
            ? this.passwordHasherService.hashOpaqueToken(stateSecret)
            : null,
          expiresAt: new Date(Date.now() + ttlFor(channel)),
        },
      );

    return {
      challenge: {
        id: challenge.id,
        channel,
        expiresAt: challenge.expiresAt,
        resendAt:
          channel === 'PHONE'
            ? challenge.expiresAt
            : new Date(
                challenge.createdAt.getTime() + EMAIL_RESEND_COOLDOWN_MS,
              ),
        ...(stateSecret ? { state: `${challenge.id}.${stateSecret}` } : {}),
      },
    };
  }
}

async function assertVerificationSendLimit(
  registrationRepository: RegistrationRepository,
  userId: string,
  channel: VerificationChannel,
) {
  const sent = await registrationRepository.countRecentChallengesForUser(
    userId,
    channel,
    new Date(Date.now() - VERIFICATION_SEND_WINDOW_MS),
  );
  if (sent >= VERIFICATION_SEND_LIMIT) {
    throw codedConflict(
      'VERIFICATION_SEND_LIMIT_REACHED',
      'Da dat gioi han 5 lan gui xac minh trong mot gio.',
    );
  }
}

@Injectable()
export class ConfirmRegistrationChallengeUseCase {
  constructor(
    private readonly registrationRepository: RegistrationRepository,
    private readonly passwordHasherService: PasswordHasherService,
    private readonly firebaseTokenVerifierService: FirebaseTokenVerifierService,
  ) {}

  async execute(input: {
    registrationToken?: string;
    challengeId: string;
    state?: string;
    idToken: string;
  }) {
    const challenge = await this.registrationRepository.findChallengeById(
      input.challengeId,
    );
    if (!challenge || challenge.status !== 'PENDING') {
      throw new BadRequestException('Verification challenge is invalid');
    }
    if (challenge.expiresAt.getTime() <= Date.now()) {
      throw codedConflict('VERIFICATION_EXPIRED', 'Ma xac minh da het han.');
    }

    const session = challenge.session;
    assertSessionActive(session);
    if (challenge.channel === 'EMAIL') {
      assertOpaqueSecret(
        input.state,
        challenge.id,
        challenge.stateTokenHash,
        this.passwordHasherService,
      );
    } else {
      assertOpaqueSecret(
        input.registrationToken,
        session.id,
        session.tokenHash,
        this.passwordHasherService,
      );
    }

    const token = await this.firebaseTokenVerifierService.verifyIdToken(
      input.idToken,
    );
    if (
      !token.authTime ||
      token.authTime < Math.floor(challenge.createdAt.getTime() / 1000)
    ) {
      throw new ForbiddenException(
        'Firebase proof predates the verification challenge',
      );
    }

    if (challenge.channel === 'EMAIL') {
      if (
        !['password', 'emailLink'].includes(token.signInProvider ?? '') ||
        !token.emailVerified ||
        normalizeEmail(token.email) !==
          normalizeEmail(session.user.email ?? undefined)
      ) {
        throw new ForbiddenException('Firebase email-link proof is invalid');
      }
    } else if (
      token.signInProvider !== 'phone' ||
      normalizePhone(token.phoneNumber) !==
        normalizePhone(session.user.phone ?? undefined)
    ) {
      throw new ForbiddenException('Firebase phone proof is invalid');
    }

    await this.registrationRepository.completeVerification({
      challengeId: challenge.id,
      sessionId: session.id,
      userId: session.userId,
      channel: challenge.channel as VerificationChannel,
    });
    return { success: true, message: 'Xac minh tai khoan thanh cong.' };
  }
}

@Injectable()
export class GetRegistrationSessionUseCase {
  constructor(
    private readonly registrationRepository: RegistrationRepository,
    private readonly passwordHasherService: PasswordHasherService,
  ) {}

  execute(registrationToken: string) {
    return getRegistrationSession(
      registrationToken,
      this.registrationRepository,
      this.passwordHasherService,
    );
  }
}

@Injectable()
export class GetEmailVerificationContextUseCase {
  constructor(
    private readonly registrationRepository: RegistrationRepository,
    private readonly passwordHasherService: PasswordHasherService,
  ) {}

  async execute(challengeId: string, state: string) {
    const challenge =
      await this.registrationRepository.findChallengeById(challengeId);
    if (
      !challenge ||
      challenge.channel !== 'EMAIL' ||
      challenge.status !== 'PENDING' ||
      challenge.expiresAt.getTime() <= Date.now()
    ) {
      throw codedConflict(
        'VERIFICATION_EXPIRED',
        'Link xac minh khong hop le hoac da het han.',
      );
    }
    assertSessionActive(challenge.session);
    assertOpaqueSecret(
      state,
      challenge.id,
      challenge.stateTokenHash,
      this.passwordHasherService,
    );
    return {
      challengeId: challenge.id,
      email: challenge.session.user.email,
      expiresAt: challenge.expiresAt,
    };
  }
}

export async function getRegistrationSession(
  registrationToken: string,
  registrationRepository: RegistrationRepository,
  passwordHasherService: PasswordHasherService,
) {
  const session = await resolveRegistrationSession(
    registrationToken,
    registrationRepository,
    passwordHasherService,
  );
  return {
    registration: {
      provider: session.provider,
      purpose: session.purpose,
      email: session.user.email,
      phone: session.user.phone,
      expiresAt: session.expiresAt,
    },
  };
}

async function resolveRegistrationSession(
  rawToken: string,
  registrationRepository: RegistrationRepository,
  passwordHasherService: PasswordHasherService,
) {
  const parsed = parseOpaqueToken(rawToken);
  const session = await registrationRepository.findRegistrationSessionById(
    parsed.id,
  );
  if (
    !session ||
    !passwordHasherService.verifyHashedValue(parsed.secret, session.tokenHash)
  ) {
    throw new UnauthorizedException('Invalid registration session');
  }
  assertSessionActive(session);
  return session;
}

function assertSessionActive(session: {
  expiresAt: Date;
  completedAt: Date | null;
  revokedAt: Date | null;
}) {
  if (
    session.completedAt ||
    session.revokedAt ||
    session.expiresAt.getTime() <= Date.now()
  ) {
    throw new UnauthorizedException('Registration session expired');
  }
}

function assertOpaqueSecret(
  rawToken: string | undefined,
  expectedId: string,
  tokenHash: string | null,
  passwordHasherService: PasswordHasherService,
) {
  const parsed = parseOpaqueToken(rawToken ?? '');
  if (
    parsed.id !== expectedId ||
    !tokenHash ||
    !passwordHasherService.verifyHashedValue(parsed.secret, tokenHash)
  ) {
    throw new UnauthorizedException('Invalid verification state');
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

function ttlFor(channel: VerificationChannel) {
  return channel === 'PHONE' ? PHONE_TTL_MS : EMAIL_TTL_MS;
}

function codedConflict(error: string, message: string) {
  return new ConflictException({ statusCode: 409, error, message });
}
