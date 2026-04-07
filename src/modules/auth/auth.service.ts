import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto';
import type { StringValue } from 'ms';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

type SafeUser = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  role: string;
  accountStatus: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = this.normalizeEmail(dto.email);
    const phone = this.normalizePhone(dto.phone);
    const displayName = dto.displayName?.trim() || null;
    const { password } = dto;

    if (!email && !phone) {
      throw new BadRequestException('Either email or phone must be provided');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          phone ? { phone } : undefined,
        ].filter(Boolean) as Array<{ email?: string; phone?: string }>,
      },
    });

    if (existing) {
      throw new BadRequestException('A user with that email or phone already exists');
    }

    const passwordHash = await this.hashPassword(password);
    const user = await this.prisma.user.create({
      data: {
        email,
        phone,
        displayName,
        password: passwordHash,
      },
    });

    return this.toSafeUser(user);
  }

  async validateUser(username: string, password: string) {
    const identifier = username.trim();
    const where = this.isEmail(identifier)
      ? { email: this.normalizeEmail(identifier) }
      : { phone: this.normalizePhone(identifier) };

    const user = await this.prisma.user.findFirst({ where });
    if (!user) return null;
    if (!user.password) return null;
    if (user.accountStatus !== 'active') {
      throw new ForbiddenException('Account is not active');
    }

    const isValid = await this.verifyPassword(password, user.password);
    return isValid ? user : null;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.username, dto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const tokenPair = await this.issueSessionTokens(user.id, user.role);
    return {
      ...tokenPair,
      user: this.toSafeUser(user),
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    if (payload.typ !== 'refresh' || !payload.sid || !payload.jti || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });

    if (!session || !session.user) {
      throw new UnauthorizedException('Refresh session not found');
    }
    if (session.revokedAt) {
      throw new UnauthorizedException('Refresh session has been revoked');
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Refresh session has expired');
    }
    if (session.user.accountStatus !== 'active') {
      await this.revokeSession(session.id);
      throw new ForbiddenException('Account is not active');
    }

    const matchesCurrentToken =
      session.currentTokenId === payload.jti &&
      this.verifyHashedValue(dto.refreshToken, session.currentTokenHash);

    if (!matchesCurrentToken) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          reuseDetectedAt: new Date(),
        },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const tokens = await this.rotateRefreshToken(session.id, session.user.id, session.user.role);
    return {
      ...tokens,
      user: this.toSafeUser(session.user),
    };
  }

  async logout(dto: RefreshTokenDto) {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    if (payload.typ !== 'refresh' || !payload.sid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sid },
    });

    if (!session) {
      return { loggedOut: true };
    }

    const matchesCurrentToken =
      session.currentTokenId === payload.jti &&
      this.verifyHashedValue(dto.refreshToken, session.currentTokenHash);

    if (!matchesCurrentToken) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: {
          revokedAt: session.revokedAt ?? new Date(),
          reuseDetectedAt: new Date(),
        },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    await this.revokeSession(session.id);
    return { loggedOut: true };
  }

  private async issueSessionTokens(userId: string, role: string): Promise<TokenPair> {
    const accessToken = await this.generateAccessToken(userId, role);
    const refreshTokenId = this.generateTokenId();
    const session = await this.prisma.authSession.create({
      data: {
        userId,
        tokenFamily: this.generateTokenId(),
        currentTokenId: refreshTokenId,
        currentTokenHash: '',
        expiresAt: this.calculateRefreshExpiry(),
      },
    });
    const refreshToken = await this.generateRefreshToken(userId, session.id, refreshTokenId);

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        currentTokenHash: this.hashOpaqueToken(refreshToken),
      },
    });

    return { accessToken, refreshToken };
  }

  private async rotateRefreshToken(
    sessionId: string,
    userId: string,
    role: string,
  ): Promise<TokenPair> {
    const accessToken = await this.generateAccessToken(userId, role);
    const nextTokenId = this.generateTokenId();
    const refreshToken = await this.generateRefreshToken(userId, sessionId, nextTokenId);

    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: {
        currentTokenId: nextTokenId,
        currentTokenHash: this.hashOpaqueToken(refreshToken),
        expiresAt: this.calculateRefreshExpiry(),
        lastUsedAt: new Date(),
      },
    });

    return { accessToken, refreshToken };
  }

  private async generateAccessToken(userId: string, role: string) {
    return this.jwtService.signAsync({
      sub: userId,
      role,
      typ: 'access',
    });
  }

  private async generateRefreshToken(userId: string, sessionId: string, tokenId: string) {
    return this.jwtService.signAsync(
      {
        sub: userId,
        sid: sessionId,
        jti: tokenId,
        typ: 'refresh',
      },
      {
        secret: this.getRefreshTokenSecret(),
        expiresIn: this.getRefreshTokenTtl() as StringValue,
      },
    );
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      return await this.jwtService.verifyAsync<{
        sub: string;
        sid: string;
        jti: string;
        typ: string;
      }>(refreshToken, {
        secret: this.getRefreshTokenSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async revokeSession(sessionId: string) {
    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private calculateRefreshExpiry(): Date {
    const now = Date.now();
    return new Date(now + this.parseDurationToMs(this.getRefreshTokenTtl()));
  }

  private getRefreshTokenSecret(): string {
    const secret = this.configService.get<string>('REFRESH_TOKEN_SECRET')?.trim();
    if (!secret) {
      throw new InternalServerErrorException('REFRESH_TOKEN_SECRET is not configured');
    }

    return secret;
  }

  private getRefreshTokenTtl(): string {
    return this.configService.get<string>('REFRESH_TOKEN_TTL')?.trim() || '7d';
  }

  private parseDurationToMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) {
      throw new BadRequestException('REFRESH_TOKEN_TTL must use s, m, h, or d units');
    }

    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  private async verifyPassword(password: string, stored: string): Promise<boolean> {
    return this.verifyHashedValue(password, stored);
  }

  private hashOpaqueToken(value: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(value, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyHashedValue(rawValue: string, stored: string): boolean {
    const [storedSalt, storedHash] = stored.split(':');
    if (!storedSalt || !storedHash) {
      return false;
    }

    const candidateHash = pbkdf2Sync(rawValue, storedSalt, 10000, 64, 'sha512').toString('hex');

    try {
      return timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(candidateHash, 'hex'));
    } catch {
      return false;
    }
  }

  private toSafeUser(user: {
    id: string;
    email: string | null;
    phone: string | null;
    displayName: string | null;
    role: string;
    accountStatus: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): SafeUser {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      role: user.role,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private normalizeEmail(email?: string): string | null {
    const normalized = email?.trim().toLowerCase();
    return normalized || null;
  }

  private normalizePhone(phone?: string): string | null {
    const normalized = phone?.trim();
    return normalized || null;
  }

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private generateTokenId(): string {
    return randomBytes(16).toString('hex');
  }
}
