import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  expireOpenTokensForUser(userId: string) {
    return this.prisma.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        usedAt: new Date(),
      },
    });
  }

  create(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return this.prisma.passwordResetToken.create({ data });
  }

  findById(id: string) {
    return this.prisma.passwordResetToken.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  markUsed(id: string) {
    return this.prisma.passwordResetToken.update({
      where: { id },
      data: {
        usedAt: new Date(),
      },
    });
  }
}
