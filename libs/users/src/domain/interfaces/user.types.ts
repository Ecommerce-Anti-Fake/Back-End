
export type UserSummary = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  address: string | null;
  role: string;
  accountStatus: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UserProfileCompletion = {
  userId: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  address: string | null;
  missingProfileFields: string[];
  isOrderReady: boolean;
};
