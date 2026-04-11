
import { User } from '@prisma/client';
import { UserSummary } from '../../domain/interfaces/user.types';
export function toUserSummary(user: User): UserSummary {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
    role: user.role,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
