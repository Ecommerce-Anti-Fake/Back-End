import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenPayload } from '@contracts';
import { randomBytes } from 'crypto';
import type { StringValue } from 'ms';

type RefreshTokenPayload = {
  sub: string;
  sid: string;
  jti: string;
  typ: string;
};

@Injectable()
export class JwtTokenAdapter {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateAccessToken(userId: string, role: string) {
    const payload: AccessTokenPayload = {
      sub: userId,
      role,
      typ: 'access',
    };

    return this.jwtService.signAsync(payload);
  }

  async generateRefreshToken(userId: string, sessionId: string, tokenId: string) {
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

  async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.getRefreshTokenSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  calculateRefreshExpiry(): Date {
    const now = Date.now();
    return new Date(now + this.parseDurationToMs(this.getRefreshTokenTtl()));
  }

  generateTokenId(): string {
    return randomBytes(16).toString('hex');
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
}
