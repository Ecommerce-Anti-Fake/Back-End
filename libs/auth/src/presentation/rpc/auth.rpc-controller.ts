import { Controller, ForbiddenException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_MESSAGE_PATTERNS } from '@contracts';
import { throwRpcException } from '@common';
import type { AuthenticatedPrincipal } from '@contracts';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RefreshTokenDto, RegisterDto, ResetPasswordDto } from '../../application/dto';
import {
  ChangePasswordUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  RegisterUseCase,
  RequestPasswordResetUseCase,
  ResetPasswordUseCase,
} from '../../application/use-cases';

@Controller()
export class AuthRpcController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
  ) {}

  @MessagePattern(AUTH_MESSAGE_PATTERNS.register)
  async register(@Payload() dto: RegisterDto) {
    try {
      return await this.registerUseCase.execute(dto);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.login)
  async login(@Payload() dto: LoginDto) {
    try {
      return await this.loginUseCase.execute(dto);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.refresh)
  async refresh(@Payload() dto: RefreshTokenDto) {
    try {
      return await this.refreshTokenUseCase.execute(dto);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.logout)
  async logout(@Payload() dto: RefreshTokenDto) {
    try {
      return await this.logoutUseCase.execute(dto);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.requestPasswordReset)
  async requestPasswordReset(@Payload() dto: ForgotPasswordDto) {
    try {
      return await this.requestPasswordResetUseCase.execute(dto);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.resetPassword)
  async resetPassword(@Payload() dto: ResetPasswordDto) {
    try {
      return await this.resetPasswordUseCase.execute(dto);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.changePassword)
  async changePassword(@Payload() payload: { userId: string; dto: ChangePasswordDto }) {
    try {
      return await this.changePasswordUseCase.execute(payload.userId, payload.dto);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.adminCheck)
  adminCheck(@Payload() user: AuthenticatedPrincipal) {
    try {
      if (user.role !== 'admin') {
        throw new ForbiddenException('Insufficient role');
      }

      return {
        message: 'Admin access granted',
        user,
      };
    } catch (error) {
      throwRpcException(error);
    }
  }
}
