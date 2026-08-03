import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class RegistrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPendingRegistrationByFirebaseUid(firebaseUid: string) {
    return this.prisma.pendingRegistration.findUnique({
      where: { firebaseUid },
    });
  }

  upsertPendingRegistration(input: {
    firebaseUid: string;
    email: string;
    phone: string;
    displayName: string;
    expiresAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.pendingRegistration.deleteMany({
        where: {
          completedAt: null,
          expiresAt: { lte: new Date() },
        },
      });

      const existing = await tx.pendingRegistration.findUnique({
        where: { firebaseUid: input.firebaseUid },
      });
      if (existing) {
        if (existing.completedAt) {
          return existing;
        }

        const duplicate = await tx.pendingRegistration.findFirst({
          where: {
            completedAt: null,
            id: { not: existing.id },
            OR: [{ email: input.email }, { phone: input.phone }],
          },
        });
        if (duplicate) {
          throw new ConflictException(
            'Email hoac so dien thoai dang cho xac minh voi tai khoan khac.',
          );
        }

        return tx.pendingRegistration.update({
          where: { id: existing.id },
          data: {
            email: input.email,
            phone: input.phone,
            displayName: input.displayName,
            expiresAt: input.expiresAt,
          },
        });
      }

      const duplicate = await tx.pendingRegistration.findFirst({
        where: {
          completedAt: null,
          OR: [{ email: input.email }, { phone: input.phone }],
        },
      });
      if (duplicate) {
        throw new ConflictException(
          'Email hoac so dien thoai dang cho xac minh voi tai khoan khac.',
        );
      }

      return tx.pendingRegistration.create({ data: input });
    });
  }

  promotePendingRegistration(input: {
    pendingId: string;
    firebaseUid: string;
    email: string;
    phone: string;
    displayName: string;
    emailVerifiedAt: Date | null;
    phoneVerifiedAt: Date | null;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        const pending = await tx.pendingRegistration.findUnique({
          where: { id: input.pendingId },
        });
        if (
          !pending ||
          pending.completedAt ||
          pending.firebaseUid !== input.firebaseUid ||
          pending.expiresAt.getTime() <= Date.now()
        ) {
          throw new ConflictException('Pending registration is invalid');
        }

        const existingIdentity = await tx.authIdentity.findUnique({
          where: {
            provider_providerSubject: {
              provider: 'FIREBASE',
              providerSubject: input.firebaseUid,
            },
          },
          include: { user: true },
        });
        if (existingIdentity) {
          if (
            existingIdentity.user.email?.trim().toLowerCase() !== input.email ||
            existingIdentity.user.phone !== input.phone
          ) {
            throw new ConflictException(
              'Firebase identity da gan voi tai khoan khac',
            );
          }
          await tx.pendingRegistration.delete({ where: { id: pending.id } });
          return existingIdentity.user;
        }

        const existingUser = await tx.user.findFirst({
          where: {
            OR: [
              { email: { equals: input.email, mode: 'insensitive' } },
              { phone: input.phone },
            ],
          },
        });
        if (existingUser) {
          throw new ConflictException(
            'Email hoac so dien thoai da duoc su dung boi tai khoan khac.',
          );
        }

        const user = await tx.user.create({
          data: {
            email: input.email,
            phone: input.phone,
            displayName: input.displayName,
            accountStatus: 'active',
            emailVerifiedAt: input.emailVerifiedAt,
            phoneVerifiedAt: input.phoneVerifiedAt,
          },
        });
        await tx.authIdentity.create({
          data: {
            userId: user.id,
            provider: 'FIREBASE',
            providerSubject: input.firebaseUid,
          },
        });
        await tx.pendingRegistration.delete({ where: { id: pending.id } });
        return user;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  deleteExpiredPendingRegistrations(now = new Date()) {
    return this.prisma.pendingRegistration.deleteMany({
      where: { completedAt: null, expiresAt: { lte: now } },
    });
  }

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

  createOrLinkGoogleUser(input: {
    email: string;
    displayName: string | null;
    firebaseUid: string;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        const existingIdentity = await tx.authIdentity.findUnique({
          where: {
            provider_providerSubject: {
              provider: 'GOOGLE',
              providerSubject: input.firebaseUid,
            },
          },
          include: { user: true },
        });
        if (existingIdentity) {
          if (
            existingIdentity.user.email?.trim().toLowerCase() !== input.email
          ) {
            throw new ConflictException('Google identity email mismatch');
          }
          return existingIdentity.user;
        }

        const existingUser = await tx.user.findFirst({
          where: { email: { equals: input.email, mode: 'insensitive' } },
        });
        if (existingUser) {
          const existingGoogleIdentity = await tx.authIdentity.findUnique({
            where: {
              userId_provider: { userId: existingUser.id, provider: 'GOOGLE' },
            },
          });
          if (
            existingGoogleIdentity &&
            existingGoogleIdentity.providerSubject !== input.firebaseUid
          ) {
            throw new ConflictException(
              'Email da duoc lien ket voi Google identity khac.',
            );
          }

          const user = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              accountStatus: 'active',
              emailVerifiedAt: new Date(),
              displayName: existingUser.displayName || input.displayName,
            },
          });
          if (!existingGoogleIdentity) {
            await tx.authIdentity.create({
              data: {
                userId: user.id,
                provider: 'GOOGLE',
                providerSubject: input.firebaseUid,
              },
            });
          }
          return user;
        }

        const user = await tx.user.create({
          data: {
            email: input.email,
            displayName: input.displayName,
            accountStatus: 'active',
            emailVerifiedAt: new Date(),
          },
        });
        await tx.authIdentity.create({
          data: {
            userId: user.id,
            provider: 'GOOGLE',
            providerSubject: input.firebaseUid,
          },
        });
        return user;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
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
