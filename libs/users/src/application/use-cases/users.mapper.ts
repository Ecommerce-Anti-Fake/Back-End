
import { User, UserAddress } from '@prisma/client';
import { AdminUserListItem, UserProfileCompletion, UserSummary } from '../../domain/interfaces/user.types';

type UserWithOwnedShops = User & {
  ownedShops?: Array<{
    shopName: string;
  }>;
};

export function toUserAddress(address: UserAddress) {
  return {
    id: address.id,
    userId: address.userId,
    recipientName: address.recipientName,
    phone: address.phone,
    addressLine: address.addressLine,
    provinceCode: address.provinceCode ?? null,
    provinceName: address.provinceName ?? null,
    wardCode: address.wardCode ?? null,
    wardName: address.wardName ?? null,
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

export function toAdminUserListItem(user: UserWithOwnedShops): AdminUserListItem {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    shopName: user.ownedShops?.[0]?.shopName ?? null,
    accountStatus: toVietnameseAccountStatus(user.accountStatus),
    createdAt: user.createdAt,
  };
}

function toVietnameseAccountStatus(accountStatus: string) {
  switch (accountStatus) {
    case 'active':
      return 'Đang hoạt động';
    case 'inactive':
      return 'Ngừng hoạt động';
    case 'blocked':
      return 'Đã khóa';
    default:
      return accountStatus;
  }
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
