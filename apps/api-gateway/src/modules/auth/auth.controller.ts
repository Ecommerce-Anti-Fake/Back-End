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
  AccountSecurityDecisionsResponseDto,
  AccountSecurityResponseDto,
  AuthUserResponseDto,
  ChangePasswordDto,
  FirebaseLoginDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  LoginDto,
  LoginResponseDto,
  LogoutResponseDto,
  RefreshResponseDto,
  RefreshTokenDto,
  RegisterDto,
  RegisterResponseDto,
  ResetPasswordDto,
} from '@auth';
import { AuthRpcService } from './auth-rpc.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authRpcService: AuthRpcService) {}

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
  register(@Body() dto: RegisterDto) {
    return this.authRpcService.register(dto);
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
  login(@Body() dto: LoginDto) {
    return this.authRpcService.login(dto);
  }

  @ApiOperation({ summary: 'Dang nhap/dang ky bang Firebase Auth da xac thuc' })
  @ApiBody({ type: FirebaseLoginDto })
  @ApiOkResponse({
    description: 'Firebase token hop le, user duoc dong bo va cap token noi bo.',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Firebase token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Email chua xac thuc hoac tai khoan khong active.',
  })
  @Post('firebase-login')
  firebaseLogin(@Body() dto: FirebaseLoginDto) {
    return this.authRpcService.firebaseLogin(dto);
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
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authRpcService.refresh(dto);
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
  logout(@Body() dto: RefreshTokenDto) {
    return this.authRpcService.logout(dto);
  }

  @ApiOperation({ summary: 'Tao password reset token neu tai khoan ton tai' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({
    description: 'Tra ve thong bao generic de tranh account enumeration.',
    type: ForgotPasswordResponseDto,
  })
  @Post('forgot-password')
  requestPasswordReset(@Body() dto: ForgotPasswordDto) {
    return this.authRpcService.requestPasswordReset(dto);
  }

  @ApiOperation({ summary: 'Dat lai mat khau bang reset token dung mot lan' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({
    description: 'Dat lai mat khau thanh cong.',
    type: AccountSecurityResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Reset token khong hop le hoac het han.',
  })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authRpcService.resetPassword(dto);
  }

  @ApiOperation({ summary: 'Doi mat khau cua user dang dang nhap' })
  @ApiBearerAuth('access-token')
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({
    description: 'Doi mat khau thanh cong va revoke refresh sessions.',
    type: AccountSecurityResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Access token hoac mat khau hien tai khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('change-password')
  changePassword(@CurrentUser() user: AuthUserResponseDto, @Body() dto: ChangePasswordDto) {
    return this.authRpcService.changePassword(user.id, dto);
  }

  @ApiOperation({ summary: 'Quyet dinh pham vi security flow hien tai' })
  @ApiOkResponse({
    description: 'Security decisions for account flows.',
    type: AccountSecurityDecisionsResponseDto,
  })
  @Get('security-decisions')
  securityDecisions(): AccountSecurityDecisionsResponseDto {
    return {
      emailProvider: 'FIREBASE_EMAIL_VERIFICATION_LINK',
      otpProvider: 'FIREBASE_PHONE_AUTH',
      oauthLogin: 'FIREBASE_GOOGLE_AUTH',
      resetTokenReturnedByDefault: false,
    };
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
  adminCheck(@CurrentUser() user: AuthUserResponseDto) {
    return {
      message: 'Admin access granted',
      user,
    };
  }
}
