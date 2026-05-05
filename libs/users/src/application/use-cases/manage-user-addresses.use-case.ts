import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toUserAddress } from './users.mapper';

function normalizeRequired(value: string | undefined, field: string) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new BadRequestException(`${field} is required`);
  }
  return normalized;
}

function normalizeOptional(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }
  return value.trim() || undefined;
}

function rethrowNotFound(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2025' || error.code === 'P2018')
  ) {
    throw new NotFoundException('Address not found');
  }

  throw error;
}

@Injectable()
export class ListUserAddressesUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(userId: string) {
    const addresses = await this.usersRepository.listUserAddresses(userId);
    return addresses.map(toUserAddress);
  }
}

@Injectable()
export class CreateUserAddressUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(input: {
    userId: string;
    recipientName: string;
    phone: string;
    addressLine: string;
    isDefault?: boolean;
  }) {
    const address = await this.usersRepository.createUserAddress({
      userId: input.userId,
      recipientName: normalizeRequired(input.recipientName, 'recipientName'),
      phone: normalizeRequired(input.phone, 'phone'),
      addressLine: normalizeRequired(input.addressLine, 'addressLine'),
      isDefault: input.isDefault,
    });

    return toUserAddress(address);
  }
}

@Injectable()
export class UpdateUserAddressUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(input: {
    userId: string;
    addressId: string;
    recipientName?: string;
    phone?: string;
    addressLine?: string;
    isDefault?: boolean;
  }) {
    try {
      const address = await this.usersRepository.updateUserAddress({
        userId: input.userId,
        addressId: input.addressId,
        recipientName: normalizeOptional(input.recipientName),
        phone: normalizeOptional(input.phone),
        addressLine: normalizeOptional(input.addressLine),
        isDefault: input.isDefault,
      });

      return toUserAddress(address);
    } catch (error) {
      rethrowNotFound(error);
    }
  }
}

@Injectable()
export class SetDefaultUserAddressUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(input: { userId: string; addressId: string }) {
    try {
      const address = await this.usersRepository.setDefaultUserAddress(input.userId, input.addressId);
      return toUserAddress(address);
    } catch (error) {
      rethrowNotFound(error);
    }
  }
}

@Injectable()
export class DeleteUserAddressUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(input: { userId: string; addressId: string }) {
    try {
      const address = await this.usersRepository.deleteUserAddress(input.userId, input.addressId);
      return toUserAddress(address);
    } catch (error) {
      rethrowNotFound(error);
    }
  }
}
