import { SafeUser } from '@contracts';

type SafeUserSource = Omit<SafeUser, 'avatar'> & {
  avatar?: string | null;
  avatarMedia?: { secureUrl: string | null } | null;
};

export function toSafeUser(user: SafeUserSource): SafeUser {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      avatar: user.avatar ?? user.avatarMedia?.secureUrl ?? null,
      role: user.role,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
}
