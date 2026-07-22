export type UserIdentityRecord = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  avatar?: string | null;
  avatarMedia?: { secureUrl: string | null } | null;
  ownedShops?: Array<{ id: string }>;
  role: string;
  accountStatus: string;
  emailVerifiedAt?: Date | null;
  phoneVerifiedAt?: Date | null;
  password?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export abstract class UserIdentityPort {
  abstract findById(id: string): Promise<UserIdentityRecord | null>;

  abstract findByIdentifier(identifier: {
    email?: string | null;
    phone?: string | null;
  }): Promise<UserIdentityRecord | null>;

  abstract create(data: {
    email: string | null;
    phone: string | null;
    displayName: string | null;
    password: string | null;
    accountStatus?: string;
  }): Promise<UserIdentityRecord>;

  abstract updatePassword(
    userId: string,
    password: string,
  ): Promise<UserIdentityRecord>;
}
