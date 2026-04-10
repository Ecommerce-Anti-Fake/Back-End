export type UserSummary = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  role: string;
  accountStatus: string;
  createdAt: Date;
  updatedAt: Date;
};
