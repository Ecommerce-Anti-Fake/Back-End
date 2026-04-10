import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@security';
import {
  AdminAccessResponseDto,
  LoginResponseDto,
  LogoutResponseDto,
  RefreshResponseDto,
  RegisterResponseDto,
  AuthUserResponseDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from '../../application/dto';
import {
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  RegisterUseCase,
} from '../../application/use-cases';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @ApiOperation({ summary: 'Dang ky tai khoan bang email hoac so dien thoai' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'Dang ky thanh cong va tra ve thong tin user an toan.',
    type: RegisterResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Thieu email/phone, du lieu khong hop le hoac tai khoan da ton tai.',
  })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @ApiOperation({ summary: 'Dang nhap va nhan access token cung refresh token' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Dang nhap thanh cong.',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Sai thong tin dang nhap.',
  })
  @ApiForbiddenResponse({
    description: 'Tai khoan khong o trang thai active.',
  })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }

  @ApiOperation({ summary: 'Dung refresh token hien tai de rotate sang cap token moi' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    description: 'Refresh thanh cong va tra ve access token cung refresh token moi.',
    type: RefreshResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token khong hop le, het han, bi revoke hoac bi reuse.',
  })
  @ApiForbiddenResponse({
    description: 'Tai khoan khong o trang thai active.',
  })
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.refreshTokenUseCase.execute(dto);
  }

  @ApiOperation({ summary: 'Dang xuat va revoke session refresh token hien tai' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    description: 'Dang xuat thanh cong.',
    type: LogoutResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token khong hop le hoac da bi reuse.',
  })
  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto) {
    return this.logoutUseCase.execute(dto);
  }

  @ApiOperation({ summary: 'Kiem tra route chi danh cho admin' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'User hien tai co quyen admin.',
    type: AdminAccessResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'User khong co quyen admin.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin-check')
  async adminCheck(@CurrentUser() user: AuthUserResponseDto) {
    return {
      message: 'Admin access granted',
      user,
    };
  }
}
