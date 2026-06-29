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

function normalizeOptional(value: string | null | undefined) {
  if (value === undefined || value === null) {
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
export class GetDefaultUserAddressUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(userId: string) {
    const address = await this.usersRepository.findDefaultAddressByUserId(userId);
    return address ? toUserAddress(address) : null;
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
    provinceCode?: string | null;
    provinceName?: string | null;
    wardCode?: string | null;
    wardName?: string | null;
    isDefault?: boolean;
  }) {
    const address = await this.usersRepository.createUserAddress({
      userId: input.userId,
      recipientName: normalizeRequired(input.recipientName, 'recipientName'),
      phone: normalizeRequired(input.phone, 'phone'),
      addressLine: normalizeRequired(input.addressLine, 'addressLine'),
      provinceCode: normalizeOptional(input.provinceCode) ?? null,
      provinceName: normalizeOptional(input.provinceName) ?? null,
      wardCode: normalizeOptional(input.wardCode) ?? null,
      wardName: normalizeOptional(input.wardName) ?? null,
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
    provinceCode?: string | null;
    provinceName?: string | null;
    wardCode?: string | null;
    wardName?: string | null;
    isDefault?: boolean;
  }) {
    try {
      const address = await this.usersRepository.updateUserAddress({
        userId: input.userId,
        addressId: input.addressId,
        recipientName: normalizeOptional(input.recipientName),
        phone: normalizeOptional(input.phone),
        addressLine: normalizeOptional(input.addressLine),
        provinceCode: input.provinceCode === undefined ? undefined : normalizeOptional(input.provinceCode) ?? null,
        provinceName: input.provinceName === undefined ? undefined : normalizeOptional(input.provinceName) ?? null,
        wardCode: input.wardCode === undefined ? undefined : normalizeOptional(input.wardCode) ?? null,
        wardName: input.wardName === undefined ? undefined : normalizeOptional(input.wardName) ?? null,
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
