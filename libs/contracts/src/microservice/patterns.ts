export const AUTH_SERVICE_CLIENT = 'AUTH_SERVICE_CLIENT';
export const USERS_SERVICE_CLIENT = 'USERS_SERVICE_CLIENT';

export const AUTH_MESSAGE_PATTERNS = {
  register: 'auth.register',
  login: 'auth.login',
  refresh: 'auth.refresh',
  logout: 'auth.logout',
  adminCheck: 'auth.admin-check',
} as const;

export const USERS_MESSAGE_PATTERNS = {
  findAll: 'users.find-all',
  getCurrentProfile: 'users.get-current-profile',
  findById: 'users.find-by-id',
  findByIdentifier: 'users.find-by-identifier',
  create: 'users.create',
  getUserById: 'users.get-user-by-id',
  updateUser: 'users.update-user',
  deleteUser: 'users.delete-user',
} as const;

export type CurrentUserProfileMessage = {
  userId: string;
};

export type UserIdentityLookupMessage = {
  id?: string;
  email?: string | null;
  phone?: string | null;
};

export type CreateUserIdentityMessage = {
  email: string | null;
  phone: string | null;
  displayName: string | null;
  password: string;
  role?: string;
};

export type ListUsersMessage = {
  role?: 'user';
};

export type UserLookupMessage = {
  id: string;
};

export type UpdateUserMessage = {
  id: string;
  email?: string;
  phone?: string;
  displayName?: string;
};
