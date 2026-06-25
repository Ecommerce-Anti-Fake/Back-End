import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  AUTH_MESSAGE_PATTERNS,
  AUTH_SERVICE_CLIENT,
} from '@contracts';
import {
  AccountSecurityResponseDto,
  FirebaseLoginDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  LoginDto,
  LogoutResponseDto,
  RefreshTokenDto,
  RegisterDto,
  RegisterResponseDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '@auth';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

type InternalTokenResponse = {
  accessToken: string;
  refreshToken: string;
  user: RegisterResponseDto;
};

@Injectable()
export class AuthRpcService {
  constructor(
    @Inject(AUTH_SERVICE_CLIENT)
    private readonly authClient: ClientProxy,
  ) {}

  register(dto: RegisterDto) {
    return this.send<RegisterResponseDto>(AUTH_MESSAGE_PATTERNS.register, dto);
  }

  login(dto: LoginDto) {
    return this.send<InternalTokenResponse>(AUTH_MESSAGE_PATTERNS.login, dto);
  }

  firebaseLogin(dto: FirebaseLoginDto) {
    return this.send<InternalTokenResponse>(AUTH_MESSAGE_PATTERNS.firebaseLogin, dto);
  }

  refresh(dto: RefreshTokenDto) {
    return this.send<InternalTokenResponse>(AUTH_MESSAGE_PATTERNS.refresh, dto);
  }

  logout(dto: RefreshTokenDto) {
    return this.send<LogoutResponseDto>(AUTH_MESSAGE_PATTERNS.logout, dto);
  }

  requestPasswordReset(dto: ForgotPasswordDto) {
    return this.send<ForgotPasswordResponseDto>(AUTH_MESSAGE_PATTERNS.requestPasswordReset, dto);
  }

  resetPassword(dto: ResetPasswordDto) {
    return this.send<AccountSecurityResponseDto>(AUTH_MESSAGE_PATTERNS.resetPassword, dto);
  }

  changePassword(userId: string, dto: ChangePasswordDto) {
    return this.send<AccountSecurityResponseDto>(AUTH_MESSAGE_PATTERNS.changePassword, { userId, dto });
  }

  private async send<TResult>(pattern: string, payload: unknown): Promise<TResult> {
    try {
      return await lastValueFrom(this.authClient.send<TResult, unknown>(pattern, payload));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
