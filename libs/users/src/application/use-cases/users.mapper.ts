
import { User, UserAddress } from '@prisma/client';
import { UserProfileCompletion, UserSummary } from '../../domain/interfaces/user.types';

export function toUserAddress(address: UserAddress) {
  return {
    id: address.id,
    userId: address.userId,
    recipientName: address.recipientName,
    phone: address.phone,
    addressLine: address.addressLine,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}

export function toUserSummary(user: User, defaultAddress?: UserAddress | null): UserSummary {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
    address: defaultAddress?.addressLine ?? null,
    defaultAddress: defaultAddress ? toUserAddress(defaultAddress) : null,
    role: user.role,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toUserProfileCompletion(user: User, defaultAddress?: UserAddress | null): UserProfileCompletion {
  const missingProfileFields: string[] = [];

  if (!user.phone?.trim()) {
    missingProfileFields.push('phone');
  }

  if (!defaultAddress?.addressLine?.trim()) {
    missingProfileFields.push('address');
  }

  return {
    userId: user.id,
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
    address: defaultAddress?.addressLine ?? null,
    defaultAddress: defaultAddress ? toUserAddress(defaultAddress) : null,
    missingProfileFields,
    isOrderReady: missingProfileFields.length === 0,
  };
}
