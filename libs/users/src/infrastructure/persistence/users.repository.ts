import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findByIdentifier(identifier: { email?: string | null; phone?: string | null }) {
    const { email, phone } = identifier;

    return this.prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          phone ? { phone } : undefined,
        ].filter(Boolean) as Array<{ email?: string; phone?: string }>,
      },
    });
  }

  create(data: {
    email: string | null;
    phone: string | null;
    displayName: string | null;
    password: string;
  }) {
    return this.prisma.user.create({ data });
  }

  findAll() {
    return this.prisma.user.findMany();
  }
}
