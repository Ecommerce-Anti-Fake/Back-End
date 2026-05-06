export type SafeUser = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  role: string;
  accountStatus: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};
