import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class AuthSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    userId: string;
    tokenFamily: string;
    currentTokenId: string;
    currentTokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.authSession.create({ data });
  }

  findById(sessionId: string) {
    return this.prisma.authSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
  }

  findSessionOnlyById(sessionId: string) {
    return this.prisma.authSession.findUnique({
      where: { id: sessionId },
    });
  }

  update(sessionId: string, data: Record<string, unknown>) {
    return this.prisma.authSession.update({
      where: { id: sessionId },
      data,
    });
  }
}
