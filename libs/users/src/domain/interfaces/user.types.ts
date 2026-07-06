
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

export type AdminUserListItem = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatar: string | null;
  shopName: string | null;
  accountStatus: string;
  createdAt: Date;
};

export type UserAddressSummary = {
  id: string;
  userId: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  provinceCode: string | null;
  provinceName: string | null;
  wardCode: string | null;
  wardName: string | null;
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
