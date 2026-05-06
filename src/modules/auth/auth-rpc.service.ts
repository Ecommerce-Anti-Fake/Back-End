import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  AUTH_MESSAGE_PATTERNS,
  AUTH_SERVICE_CLIENT,
} from '@contracts';
import { LoginDto, RefreshTokenDto, RegisterDto } from '@contracts/dto';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AuthRpcService {
  constructor(
    @Inject(AUTH_SERVICE_CLIENT)
    private readonly authClient: ClientProxy,
  ) {}

  register(dto: RegisterDto) {
    return this.send(AUTH_MESSAGE_PATTERNS.register, dto);
  }

  login(dto: LoginDto) {
    return this.send(AUTH_MESSAGE_PATTERNS.login, dto);
  }

  refresh(dto: RefreshTokenDto) {
    return this.send(AUTH_MESSAGE_PATTERNS.refresh, dto);
  }

  logout(dto: RefreshTokenDto) {
    return this.send(AUTH_MESSAGE_PATTERNS.logout, dto);
  }

  private async send<TResult>(pattern: string, payload: unknown): Promise<TResult> {
    try {
      return await lastValueFrom(this.authClient.send<TResult, unknown>(pattern, payload));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
