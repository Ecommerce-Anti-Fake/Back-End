import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';

@Injectable()
export class UpdateCurrentUserProfileUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(
    userId: string,
    data: {
      phone?: string | null;
      displayName?: string | null;
    },
  ) {
    const current = await this.usersRepository.findById(userId);
    if (!current) {
      throw new NotFoundException('User not found');
    }

    const phone = this.normalizeNullableString(data.phone);
    const displayName = this.normalizeNullableString(data.displayName);

    if (phone === undefined && displayName === undefined) {
      throw new BadRequestException('At least one profile field must be provided');
    }

    if (phone !== undefined && phone !== null && phone !== current.phone) {
      const existing = await this.usersRepository.findUserByEmailOrPhone({ phone }, userId);
      if (existing) {
        throw new BadRequestException('A user with that phone already exists');
      }
    }

    await this.usersRepository.updateUser(userId, {
      phone,
      displayName,
    });

    return { success: true, message: 'Cập nhật hồ sơ thành công.' };
  }

  private normalizeNullableString(value?: string | null): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    return value.trim() || null;
  }
}
