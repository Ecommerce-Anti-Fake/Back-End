
import { User } from '@prisma/client';
import { UserProfileCompletion, UserSummary } from '../../domain/interfaces/user.types';

export function toUserSummary(user: User): UserSummary {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
    address: user.address,
    role: user.role,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toUserProfileCompletion(user: User): UserProfileCompletion {
  const missingProfileFields: string[] = [];

  if (!user.phone?.trim()) {
    missingProfileFields.push('phone');
  }

  return {
    userId: user.id,
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
    address: user.address,
    missingProfileFields,
    isOrderReady: missingProfileFields.length === 0,
  };
}
