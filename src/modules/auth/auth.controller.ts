// auth.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  LoginResponseDto,
  LogoutResponseDto,
  RefreshResponseDto,
  RegisterResponseDto,
} from './dto/auth-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Đăng ký tài khoản bằng email hoặc số điện thoại' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'Đăng ký thành công và trả về thông tin user an toàn.',
    type: RegisterResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Thiếu email/phone, dữ liệu không hợp lệ hoặc tài khoản đã tồn tại.',
  })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Đăng nhập và nhận access token cùng refresh token' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Đăng nhập thành công.',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Sai thông tin đăng nhập.',
  })
  @ApiForbiddenResponse({
    description: 'Tài khoản không ở trạng thái active.',
  })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Dùng refresh token hiện tại để rotate sang cặp token mới' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    description: 'Refresh thành công và trả về access token cùng refresh token mới.',
    type: RefreshResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token không hợp lệ, hết hạn, bị revoke hoặc bị reuse.',
  })
  @ApiForbiddenResponse({
    description: 'Tài khoản không ở trạng thái active.',
  })
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @ApiOperation({ summary: 'Đăng xuất và revoke session refresh token hiện tại' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    description: 'Đăng xuất thành công.',
    type: LogoutResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token không hợp lệ hoặc đã bị reuse.',
  })
  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }
}
