
export type UserSummary = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  address: string | null;
  defaultAddress: UserAddressSummary | null;
  role: string;
  accountStatus: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UserAddressSummary = {
  id: string;
  userId: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UserProfileCompletion = {
  userId: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  address: string | null;
  defaultAddress: UserAddressSummary | null;
  missingProfileFields: string[];
  isOrderReady: boolean;
};
