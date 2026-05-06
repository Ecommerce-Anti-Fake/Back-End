import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '@contracts';
import { getAuthContext } from '../execution-context/auth-context';

type AuthenticatedRequest = {
  user?: AuthenticatedUser;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined => {
    const request = getAuthContext(context) as AuthenticatedRequest;
    return request.user;
  },
);
