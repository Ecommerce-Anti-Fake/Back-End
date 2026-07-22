import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedUser, SafeUser, UserIdentityPort } from '@contracts';
import { getAuthContext } from '../execution-context/auth-context';

type AuthenticatedRequest = {
  user?: AuthenticatedUser;
};

@Injectable()
export class ActiveUserGuard implements CanActivate {
  constructor(
    @Inject(UserIdentityPort)
    private readonly userIdentityPort: UserIdentityPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = getAuthContext(context) as AuthenticatedRequest;
    const tokenPrincipal =
      request.user && 'sub' in request.user ? request.user.sub : undefined;
    const userId = request.user?.id ?? tokenPrincipal;

    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user context');
    }

    const user = await this.userIdentityPort.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.accountStatus !== 'active') {
      throw new ForbiddenException('Account is not active');
    }

    const safeUser: SafeUser = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      role: user.role,
      accountStatus: user.accountStatus,
      avatar: user.avatar ?? user.avatarMedia?.secureUrl ?? null,
      shopId: user.ownedShops?.[0]?.id ?? null,
      emailVerified: Boolean(user.emailVerifiedAt),
      phoneVerified: Boolean(user.phoneVerifiedAt),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    request.user = safeUser;
    return true;
  }
}
