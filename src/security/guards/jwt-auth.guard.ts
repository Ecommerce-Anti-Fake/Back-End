import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenPayload, AuthenticatedPrincipal } from '@contracts';
import { getAuthContext } from '../execution-context/auth-context';

type AuthenticatedRequest = {
  headers?: Record<string, string | string[] | undefined>;
  user?: AuthenticatedPrincipal;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = getAuthContext(context) as AuthenticatedRequest;
    const token = this.extractBearerToken(request.headers?.authorization);

    if (!token) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    if (!payload.sub || !payload.role || payload.typ !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    request.user = {
      sub: payload.sub,
      id: payload.sub,
      role: payload.role,
    };
    return true;
  }

  private extractBearerToken(authorizationHeader?: string | string[]): string | null {
    const value = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
    if (!value) {
      return null;
    }

    const [scheme, token] = value.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
