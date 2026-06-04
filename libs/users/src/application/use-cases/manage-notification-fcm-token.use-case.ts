import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';

@Injectable()
export class RegisterNotificationFcmTokenUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(input: { userId: string; token: string; deviceId?: string | null; userAgent?: string | null }) {
    const token = input.token.trim();
    if (!token) {
      throw new BadRequestException('FCM token is required');
    }

    const record = await this.usersRepository.registerNotificationFcmToken({
      userId: input.userId,
      token,
      deviceId: input.deviceId,
      userAgent: input.userAgent,
    });

    return {
      id: record.id,
      deviceId: record.deviceId,
      revokedAt: record.revokedAt,
      updatedAt: record.updatedAt,
    };
  }
}

@Injectable()
export class RevokeNotificationFcmTokenUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(input: { userId: string; token?: string | null; deviceId?: string | null }) {
    if (!input.token?.trim() && !input.deviceId?.trim()) {
      throw new BadRequestException('FCM token or device id is required');
    }

    const result = await this.usersRepository.revokeNotificationFcmToken({
      userId: input.userId,
      token: input.token?.trim(),
      deviceId: input.deviceId?.trim(),
    });

    return { revokedCount: result.count };
  }
}
