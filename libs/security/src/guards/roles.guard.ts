import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { getAuthContext } from '../execution-context/auth-context';

type AuthenticatedRequest = {
  user?: {
    role?: string;
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles required, allow access
    if (!requiredRoles || !Array.isArray(requiredRoles) || requiredRoles.length === 0) {
      return true;
    }

    const request = getAuthContext(context) as AuthenticatedRequest;
    const userRole = request.user?.role;

    // Only throw if roles are required AND user doesn't have the required role
    // Compare case-insensitively to handle role mismatches
    if (
      !userRole ||
      !requiredRoles.some((role) => role.toLowerCase() === userRole.toLowerCase())
    ) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
