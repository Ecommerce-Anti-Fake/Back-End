import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET')?.trim();
        if (!secret) {
          throw new Error('JWT_SECRET is not configured');
        }

        return {
          secret,
          signOptions: {
            expiresIn:
              (configService.get<string>('ACCESS_TOKEN_TTL')?.trim() as StringValue) || '15m',
          },
        };
      },
    }),
  ],
  providers: [JwtAuthGuard, RolesGuard, Reflector],
  exports: [JwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthGuardsModule {}
