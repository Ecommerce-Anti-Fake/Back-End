import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  RegisterDto,
  RegisterResponseDto,
  ResetPasswordDto,
} from '@auth';
import { RateLimit } from '../../observability';
import { AuthRpcService } from './auth-rpc.service';
import type { Request, Response } from 'express';

type InternalTokenResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponseDto;
};

const REFRESH_TOKEN_COOKIE = 'eaf_refresh_token';
const REFRESH_TOKEN_COOKIE_PATH = '/api/auth';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authRpcService: AuthRpcService,
    private readonly configService: ConfigService,
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
  @RateLimit({ profile: 'auth' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authRpcService.register(dto);
  }

  @ApiOperation({ summary: 'Dang nhap va luu refresh token trong httpOnly cookie' })
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
  @RateLimit({ profile: 'auth' })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.exposeAccessToken(await this.authRpcService.login(dto), response);
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
  @RateLimit({ profile: 'auth' })
  @Post('firebase-login')
  async firebaseLogin(@Body() dto: FirebaseLoginDto, @Res({ passthrough: true }) response: Response) {
    return this.exposeAccessToken(await this.authRpcService.firebaseLogin(dto), response);
  }

  @ApiOperation({ summary: 'Dung refresh token trong httpOnly cookie de rotate sang cap token moi' })
  @ApiOkResponse({
    description: 'Refresh thanh cong, tra ve access token va set refresh token moi trong cookie.',
    type: RefreshResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token khong hop le, het han, bi revoke hoac bi reuse.',
  })
  @ApiForbiddenResponse({
    description: 'Tai khoan khong o trang thai active.',
  })
  @RateLimit({ profile: 'auth' })
  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.exposeAccessToken(
      await this.authRpcService.refresh({ refreshToken: this.readRefreshTokenCookie(request) }),
      response,
    );
  }

  @ApiOperation({ summary: 'Dang xuat va revoke session refresh token hien tai' })
  @ApiOkResponse({
    description: 'Dang xuat thanh cong.',
    type: LogoutResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token khong hop le hoac da bi reuse.',
  })
  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    try {
      return await this.authRpcService.logout({
        refreshToken: this.readRefreshTokenCookie(request),
      });
    } finally {
      this.clearRefreshTokenCookie(response);
    }
  }

  @ApiOperation({ summary: 'Tao password reset token neu tai khoan ton tai' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({
    description: 'Tra ve thong bao generic de tranh account enumeration.',
    type: ForgotPasswordResponseDto,
  })
  @RateLimit({ profile: 'auth', limit: 5 })
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
  @RateLimit({ profile: 'auth', limit: 5 })
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

  private exposeAccessToken(tokenResponse: InternalTokenResponse, response: Response): RefreshResponseDto {
    this.setRefreshTokenCookie(response, tokenResponse.refreshToken);
    return {
      accessToken: tokenResponse.accessToken,
      user: tokenResponse.user,
    };
  }

  private readRefreshTokenCookie(request: Request): string {
    const refreshToken = this.parseCookieHeader(request.headers.cookie)[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    return refreshToken;
  }

  private setRefreshTokenCookie(response: Response, refreshToken: string) {
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: this.isSecureCookieEnabled(),
      sameSite: 'lax',
      path: REFRESH_TOKEN_COOKIE_PATH,
      maxAge: this.getRefreshTokenMaxAgeMs(),
    });
  }

  private clearRefreshTokenCookie(response: Response) {
    response.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: this.isSecureCookieEnabled(),
      sameSite: 'lax',
      path: REFRESH_TOKEN_COOKIE_PATH,
    });
  }

  private parseCookieHeader(header?: string): Record<string, string> {
    return (header ?? '').split(';').reduce<Record<string, string>>((cookies, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex <= 0) {
        return cookies;
      }

      const name = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      cookies[name] = decodeURIComponent(value);
      return cookies;
    }, {});
  }

  private isSecureCookieEnabled() {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  private getRefreshTokenMaxAgeMs() {
    const ttl = this.configService.get<string>('REFRESH_TOKEN_TTL')?.trim() || '7d';
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const value = Number(match[1]);
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[match[2]];
  }
}
