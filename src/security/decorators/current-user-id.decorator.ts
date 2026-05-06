import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser } from '@contracts';
import { getAuthContext } from '../execution-context/auth-context';

type AuthenticatedRequest = {
  user?: AuthenticatedUser;
};

export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = getAuthContext(context) as AuthenticatedRequest;
    const user = request.user;

    if (!user?.id) {
      throw new UnauthorizedException('Missing authenticated user id');
    }

    return user.id;
  },
);
