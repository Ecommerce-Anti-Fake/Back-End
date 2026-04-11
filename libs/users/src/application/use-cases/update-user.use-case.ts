import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toUserSummary } from './users.mapper';

@Injectable()
export class UpdateUserUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(
    id: string,
    data: {
      email?: string;
      phone?: string;
      displayName?: string;
    },
  ) {
    const current = await this.usersRepository.findUserById(id);
    if (!current) {
      throw new NotFoundException('User not found');
    }

    const email = this.normalizeEmail(data.email);
    const phone = this.normalizePhone(data.phone);
    const displayName = data.displayName === undefined ? undefined : data.displayName.trim() || null;

    if (email === null && phone === null) {
      throw new BadRequestException('Either email or phone must be provided');
    }

    const nextEmail = email === undefined ? current.email : email;
    const nextPhone = phone === undefined ? current.phone : phone;
    if (!nextEmail && !nextPhone) {
      throw new BadRequestException('Either email or phone must be provided');
    }

    const hasIdentifierChange = nextEmail !== current.email || nextPhone !== current.phone;
    if (hasIdentifierChange) {
      const existing = await this.usersRepository.findUserByEmailOrPhone(
        { email: nextEmail, phone: nextPhone },
        id,
      );
      if (existing) {
        throw new BadRequestException('A user with that email or phone already exists');
      }
    }

    const user = await this.usersRepository.updateUser(id, {
      email,
      phone,
      displayName,
    });

    return toUserSummary(user);
  }

  private normalizeEmail(value?: string): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();
    return normalized || null;
  }

  private normalizePhone(value?: string): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    const normalized = value.trim();
    return normalized || null;
  }
}
