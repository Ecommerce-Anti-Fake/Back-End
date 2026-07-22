import { SafeUser } from '@contracts';

type SafeUserSource = Omit<
  SafeUser,
  'avatar' | 'shopId' | 'emailVerified' | 'phoneVerified'
> & {
  avatar?: string | null;
  shopId?: string | null;
  avatarMedia?: { secureUrl: string | null } | null;
  ownedShops?: Array<{ id: string }>;
  emailVerifiedAt?: Date | null;
  phoneVerifiedAt?: Date | null;
};

export function toSafeUser(user: SafeUserSource): SafeUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
    avatar: user.avatar ?? user.avatarMedia?.secureUrl ?? null,
    shopId: user.shopId ?? user.ownedShops?.[0]?.id ?? null,
    role: user.role,
    accountStatus: user.accountStatus,
    emailVerified: Boolean(user.emailVerifiedAt),
    phoneVerified: Boolean(user.phoneVerifiedAt),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
