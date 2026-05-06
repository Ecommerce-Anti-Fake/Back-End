export type UserIdentityRecord = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  role: string;
  accountStatus: string;
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
    password: string;
  }): Promise<UserIdentityRecord>;
}
