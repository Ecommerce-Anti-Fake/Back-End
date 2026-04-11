import { Controller, ForbiddenException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_MESSAGE_PATTERNS } from '@contracts';
import { throwRpcException } from '@common';
import type { AuthenticatedPrincipal } from '@contracts';
import { LoginDto, RefreshTokenDto, RegisterDto } from '../../application/dto';
import {
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  RegisterUseCase,
} from '../../application/use-cases';

@Controller()
export class AuthRpcController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
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
