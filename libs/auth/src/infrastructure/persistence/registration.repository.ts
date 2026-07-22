import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class RegistrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByIdentifier(identifier: {
    email?: string | null;
    phone?: string | null;
  }) {
    const filters = [
      identifier.email
        ? { email: { equals: identifier.email, mode: 'insensitive' as const } }
        : undefined,
      identifier.phone ? { phone: identifier.phone } : undefined,
    ].filter(Boolean) as Prisma.UserWhereInput[];

    if (filters.length === 0) {
      return null;
    }

    return this.prisma.user.findFirst({ where: { OR: filters } });
  }

  findGoogleIdentityByUserId(userId: string) {
    return this.prisma.authIdentity.findUnique({
      where: { userId_provider: { userId, provider: 'GOOGLE' } },
    });
  }

  findAuthIdentity(provider: string, providerSubject: string) {
    return this.prisma.authIdentity.findUnique({
      where: { provider_providerSubject: { provider, providerSubject } },
      include: { user: true },
    });
  }

  createLocalRegistration(input: {
    email: string;
    phone: string;
    displayName: string;
    password: string;
    accountStatus: 'pending_verification';
    sessionProvider: 'LOCAL';
    sessionPurpose: 'REGISTER';
    sessionTokenHash: string;
    sessionExpiresAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          phone: input.phone,
          displayName: input.displayName,
          password: input.password,
          accountStatus: input.accountStatus,
        },
      });
      const session = await tx.registrationSession.create({
        data: {
          userId: user.id,
          provider: input.sessionProvider,
          purpose: input.sessionPurpose,
          tokenHash: input.sessionTokenHash,
          expiresAt: input.sessionExpiresAt,
        },
      });

      return { user, session };
    });
  }

  replaceExpiredLocalRegistration(input: {
    userId: string;
    email: string;
    phone: string;
    displayName: string;
    password: string;
    sessionTokenHash: string;
    sessionExpiresAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const reset = await tx.user.updateMany({
        where: { id: input.userId, accountStatus: 'pending_verification' },
        data: {
          email: input.email,
          phone: input.phone,
          displayName: input.displayName,
          password: input.password,
          emailVerifiedAt: null,
          phoneVerifiedAt: null,
          createdAt: new Date(),
        },
      });
      if (reset.count !== 1) {
        throw new ConflictException(
          'Pending registration can no longer be replaced',
        );
      }
      await tx.registrationSession.deleteMany({
        where: { userId: input.userId },
      });
      await tx.authLinkIntent.deleteMany({ where: { userId: input.userId } });
      const session = await tx.registrationSession.create({
        data: {
          userId: input.userId,
          provider: 'LOCAL',
          purpose: 'REGISTER',
          tokenHash: input.sessionTokenHash,
          expiresAt: input.sessionExpiresAt,
        },
      });
      return { session };
    });
  }

  createGoogleRegistration(input: {
    email: string;
    displayName: string | null;
    firebaseUid: string;
    accountStatus: 'pending_verification';
    sessionProvider: 'GOOGLE';
    sessionPurpose: 'REGISTER';
    sessionTokenHash: string;
    sessionExpiresAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          phone: null,
          displayName: input.displayName,
          password: null,
          accountStatus: input.accountStatus,
        },
      });
      await tx.authIdentity.create({
        data: {
          userId: user.id,
          provider: 'GOOGLE',
          providerSubject: input.firebaseUid,
        },
      });
      const session = await tx.registrationSession.create({
        data: {
          userId: user.id,
          provider: input.sessionProvider,
          purpose: input.sessionPurpose,
          tokenHash: input.sessionTokenHash,
          expiresAt: input.sessionExpiresAt,
        },
      });
      return { user, session };
    });
  }

  replaceExpiredGoogleRegistration(input: {
    userId: string;
    email: string;
    displayName: string | null;
    sessionTokenHash: string;
    sessionExpiresAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const reset = await tx.user.updateMany({
        where: { id: input.userId, accountStatus: 'pending_verification' },
        data: {
          email: input.email,
          displayName: input.displayName,
          emailVerifiedAt: null,
          createdAt: new Date(),
        },
      });
      if (reset.count !== 1) {
        throw new ConflictException(
          'Pending Google registration can no longer be replaced',
        );
      }
      await tx.registrationSession.deleteMany({
        where: { userId: input.userId },
      });
      await tx.authLinkIntent.deleteMany({ where: { userId: input.userId } });
      const session = await tx.registrationSession.create({
        data: {
          userId: input.userId,
          provider: 'GOOGLE',
          purpose: 'REGISTER',
          tokenHash: input.sessionTokenHash,
          expiresAt: input.sessionExpiresAt,
        },
      });
      return { session };
    });
  }

  createRegistrationSession(input: {
    userId: string;
    provider: 'LOCAL' | 'GOOGLE';
    purpose: 'REGISTER' | 'LINK_GOOGLE' | 'VERIFY_PHONE';
    tokenHash: string;
    expiresAt: Date;
    pendingProviderSubject?: string | null;
    consumeLinkIntentId?: string;
  }) {
    const { consumeLinkIntentId, ...data } = input;
    if (!consumeLinkIntentId) {
      return this.prisma.registrationSession.create({ data });
    }

    return this.prisma.$transaction(async (tx) => {
      const consumed = await tx.authLinkIntent.updateMany({
        where: { id: consumeLinkIntentId, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) {
        throw new ConflictException('Google link intent was already used');
      }
      return tx.registrationSession.create({ data });
    });
  }

  createGoogleLinkIntent(input: {
    userId: string;
    providerSubject: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.authLinkIntent.create({
      data: { ...input, provider: 'GOOGLE' },
    });
  }

  findGoogleLinkIntentById(id: string) {
    return this.prisma.authLinkIntent.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  completeGoogleLink(intentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const intent = await tx.authLinkIntent.findUniqueOrThrow({
        where: { id: intentId },
      });
      const consumed = await tx.authLinkIntent.updateMany({
        where: { id: intentId, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) {
        throw new ConflictException('Google link intent was already used');
      }
      return tx.authIdentity.create({
        data: {
          userId: intent.userId,
          provider: 'GOOGLE',
          providerSubject: intent.providerSubject,
        },
      });
    });
  }

  setLocalCredentials(input: {
    userId: string;
    phone: string;
    password: string;
    sessionTokenHash: string;
    sessionExpiresAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: input.userId },
        data: {
          phone: input.phone,
          phoneVerifiedAt: null,
          password: input.password,
        },
      });
      const session = await tx.registrationSession.create({
        data: {
          userId: input.userId,
          provider: 'LOCAL',
          purpose: 'VERIFY_PHONE',
          tokenHash: input.sessionTokenHash,
          expiresAt: input.sessionExpiresAt,
        },
      });
      return { user, session };
    });
  }

  findRegistrationSessionById(id: string) {
    return this.prisma.registrationSession.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  findPendingChallenge(sessionId: string) {
    return this.prisma.registrationChallenge.findFirst({
      where: { sessionId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  countRecentChallengesForUser(
    userId: string,
    channel: 'EMAIL' | 'PHONE',
    since: Date,
  ) {
    return this.prisma.registrationChallenge.count({
      where: {
        channel,
        createdAt: { gte: since },
        session: { userId },
      },
    });
  }

  createChallenge(input: {
    sessionId: string;
    channel: 'EMAIL' | 'PHONE';
    stateTokenHash: string | null;
    expiresAt: Date;
  }) {
    return this.prisma.registrationChallenge.create({ data: input });
  }

  findChallengeById(id: string) {
    return this.prisma.registrationChallenge.findUnique({
      where: { id },
      include: {
        session: {
          include: { user: true },
        },
      },
    });
  }

  supersedeChallengeAndCreate(
    challengeId: string,
    input: {
      sessionId: string;
      channel: 'EMAIL' | 'PHONE';
      stateTokenHash: string | null;
      expiresAt: Date;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.registrationChallenge.update({
        where: { id: challengeId },
        data: { status: 'SUPERSEDED' },
      });
      return tx.registrationChallenge.create({ data: input });
    });
  }

  completeVerification(input: {
    challengeId: string;
    sessionId: string;
    userId: string;
    channel: 'EMAIL' | 'PHONE';
  }) {
    return this.prisma.$transaction(async (tx) => {
      const consumed = await tx.registrationChallenge.updateMany({
        where: {
          id: input.challengeId,
          sessionId: input.sessionId,
          status: 'PENDING',
        },
        data: { status: 'VERIFIED', verifiedAt: new Date() },
      });
      if (consumed.count !== 1) {
        throw new ConflictException('Verification challenge was already used');
      }

      const session = await tx.registrationSession.findUniqueOrThrow({
        where: { id: input.sessionId },
      });
      const verifiedAt = new Date();
      const user = await tx.user.update({
        where: { id: input.userId },
        data: {
          ...(session.purpose === 'REGISTER'
            ? { accountStatus: 'active' }
            : {}),
          ...(input.channel === 'EMAIL'
            ? { emailVerifiedAt: verifiedAt }
            : { phoneVerifiedAt: verifiedAt }),
        },
      });

      if (session.purpose === 'LINK_GOOGLE' && session.pendingProviderSubject) {
        await tx.authIdentity.create({
          data: {
            userId: input.userId,
            provider: 'GOOGLE',
            providerSubject: session.pendingProviderSubject,
          },
        });
      }

      await tx.registrationSession.update({
        where: { id: input.sessionId },
        data: { completedAt: verifiedAt },
      });
      return user;
    });
  }
}
