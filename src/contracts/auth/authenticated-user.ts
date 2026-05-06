import { AccessTokenPayload } from './access-token-payload';
import { SafeUser } from './auth.types';

export type AuthenticatedPrincipal = Pick<AccessTokenPayload, 'sub' | 'role'> & {
  id: string;
};

export type AuthenticatedUser = SafeUser | AuthenticatedPrincipal;
