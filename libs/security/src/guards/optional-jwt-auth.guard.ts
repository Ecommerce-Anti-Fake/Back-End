import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { getAuthContext } from '../execution-context/auth-context';
import { JwtAuthGuard } from './jwt-auth.guard';

type AuthenticatedRequest = {
  headers?: Record<string, string | string[] | undefined>;
};

@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = getAuthContext(context) as AuthenticatedRequest;

    if (!request.headers?.authorization) {
      return true;
    }

    return super.canActivate(context);
  }
}
