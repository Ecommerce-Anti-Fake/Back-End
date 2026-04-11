import { ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '@contracts';

type ContextWithAuth = {
  headers?: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
};

export function getAuthContext(context: ExecutionContext): ContextWithAuth {
  if (context.getType<'http' | 'rpc'>() === 'rpc') {
    const rpcData = context.switchToRpc().getData<ContextWithAuth | undefined>();
    return rpcData ?? {};
  }

  return context.switchToHttp().getRequest<ContextWithAuth>();
}
