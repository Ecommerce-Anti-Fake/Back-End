import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedUser, SafeUser, UserIdentityPort } from '@contracts';

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
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tokenPrincipal = request.user && 'sub' in request.user ? request.user.sub : undefined;
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

    const { password: _removed, ...safeUser } = user;
    request.user = safeUser;
    return true;
  }
}
