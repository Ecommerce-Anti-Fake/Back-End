export type SafeUser = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  avatar: string | null;
  shopId: string | null;
  role: string;
  accountStatus: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};
