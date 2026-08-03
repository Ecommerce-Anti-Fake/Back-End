import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
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
import {
  ActiveUserGuard,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '@security';
import {
  AdminAccessResponseDto,
  AccountSecurityDecisionsResponseDto,
  AccountSecurityResponseDto,
  AuthUserResponseDto,
  ChangePasswordDto,
  ConfirmRegistrationChallengeDto,
  CreateRegistrationChallengeDto,
  FirebaseLoginDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  GoogleRegisterDto,
  LoginDto,
  LoginResponseDto,
  LogoutResponseDto,
  RefreshResponseDto,
  RegisterDto,
  RegisterResponseDto,
  ResetPasswordDto,
  SetLocalCredentialsDto,
} from '@auth';
import { RateLimit } from '../../observability';
import { AuthRpcService } from './auth-rpc.service';
import type { CookieOptions, Request, Response } from 'express';

type InternalTokenResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponseDto;
};

const REFRESH_TOKEN_COOKIE = 'eaf_refresh_token';
const REGISTRATION_SESSION_COOKIE = 'eaf_registration_session';
const GOOGLE_LINK_INTENT_COOKIE = 'eaf_google_link_intent';
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
    description:
      'Tao hoac cap nhat PendingRegistration; User chinh thuc chi duoc tao sau khi Firebase proof thanh cong.',
    type: RegisterResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Thieu token/phone/displayName, token Firebase khong hop le hoac tai khoan da ton tai.',
  })
  @RateLimit({ profile: 'auth' })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authRpcService.register(dto);
  }

  @ApiOperation({
    summary: 'Dang ky tai khoan Google da xac minh email',
  })
  @RateLimit({ profile: 'auth' })
  @Post('google-register')
  async googleRegister(
    @Body() dto: GoogleRegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.exposeAccessToken(
      await this.authRpcService.googleRegister(dto),
      response,
    );
  }

  @ApiOperation({
    summary: 'Dang nhap va luu refresh token trong httpOnly cookie',
  })
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
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.exposeAccessToken(
      await this.authRpcService.login(dto),
      response,
    );
  }

  @ApiOperation({ summary: 'Dang nhap/dang ky bang Firebase Auth da xac thuc' })
  @ApiBody({ type: FirebaseLoginDto })
  @ApiOkResponse({
    description:
      'Firebase token hop le, user duoc dong bo va cap token noi bo.',
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
  async firebaseLogin(
    @Body() dto: FirebaseLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.exposeAccessToken(
      await this.authRpcService.firebaseLogin(dto),
      response,
    );
  }

  @ApiOperation({ summary: 'Tiep tuc phien dang ky dang cho trong 24 gio' })
  @RateLimit({ profile: 'auth' })
  @Post('registration-verifications/resume')
  async resumeRegistration(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.exposeRegistration(
      await this.authRpcService.resumeRegistration(dto),
      response,
    );
  }

  @ApiOperation({ summary: 'Lay phien dang ky dang cho xac minh' })
  @RateLimit({ profile: 'auth' })
  @Get('registration-verifications/session')
  getRegistrationSession(@Req() request: Request) {
    return this.authRpcService.getRegistrationSession(
      this.readCookie(
        request,
        REGISTRATION_SESSION_COOKIE,
        'Missing registration session',
      ),
    );
  }

  @ApiOperation({
    summary: 'Lay email duoc rang buoc boi opaque Email Link state',
  })
  @RateLimit({ profile: 'auth', limit: 10 })
  @Get('registration-verifications/email-context')
  getEmailVerificationContext(
    @Query('challengeId') challengeId: string,
    @Query('state') state: string,
  ) {
    if (!challengeId || !state) {
      throw new UnauthorizedException('Missing email verification state');
    }
    return this.authRpcService.getEmailVerificationContext(challengeId, state);
  }

  @ApiOperation({ summary: 'Tao challenge xac minh email hoac so dien thoai' })
  @RateLimit({ profile: 'auth', limit: 5 })
  @Post('registration-verifications')
  createRegistrationChallenge(
    @Req() request: Request,
    @Body() dto: CreateRegistrationChallengeDto,
  ) {
    return this.authRpcService.createRegistrationChallenge(
      this.readCookie(
        request,
        REGISTRATION_SESSION_COOKIE,
        'Missing registration session',
      ),
      dto,
    );
  }

  @ApiOperation({ summary: 'Gui lai challenge xac minh khi da den resendAt' })
  @RateLimit({ profile: 'auth', limit: 5 })
  @Post('registration-verifications/:id/resend')
  resendRegistrationChallenge(
    @Req() request: Request,
    @Param('id') challengeId: string,
  ) {
    return this.authRpcService.resendRegistrationChallenge(
      this.readCookie(
        request,
        REGISTRATION_SESSION_COOKIE,
        'Missing registration session',
      ),
      challengeId,
    );
  }

  @ApiOperation({ summary: 'Xac nhan challenge bang Firebase proof moi' })
  @RateLimit({ profile: 'auth', limit: 10 })
  @Post('registration-verifications/:id/confirm')
  async confirmRegistrationChallenge(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id') challengeId: string,
    @Body() dto: ConfirmRegistrationChallengeDto,
  ) {
    const result = await this.authRpcService.confirmRegistrationChallenge(
      this.readOptionalCookie(request, REGISTRATION_SESSION_COOKIE),
      challengeId,
      dto,
    );
    this.clearScopedAuthCookie(response, REGISTRATION_SESSION_COOKIE);
    return result;
  }

  @ApiOperation({
    summary: 'Lien ket Google sau khi user da dang nhap bang mat khau',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @RateLimit({ profile: 'auth', limit: 5 })
  @Post('google-link-intents/confirm')
  async confirmGoogleLink(
    @CurrentUser() user: AuthUserResponseDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authRpcService.confirmGoogleLink(
      user.id,
      this.readCookie(
        request,
        GOOGLE_LINK_INTENT_COOKIE,
        'Missing Google link intent',
      ),
    );
    this.clearScopedAuthCookie(response, GOOGLE_LINK_INTENT_COOKIE);
    if ('registrationToken' in result) {
      return this.exposeRegistration(result, response);
    }
    return result;
  }

  @ApiOperation({
    summary: 'Them mat khau va so dien thoai vao tai khoan Google',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @RateLimit({ profile: 'auth', limit: 5 })
  @Post('local-credentials')
  async setLocalCredentials(
    @CurrentUser() user: AuthUserResponseDto,
    @Body() dto: SetLocalCredentialsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.exposeRegistration(
      await this.authRpcService.setLocalCredentials(user.id, dto),
      response,
    );
  }

  @ApiOperation({
    summary:
      'Dung refresh token trong httpOnly cookie de rotate sang cap token moi',
  })
  @ApiOkResponse({
    description:
      'Refresh thanh cong, tra ve access token va set refresh token moi trong cookie.',
    type: RefreshResponseDto,
  })
  @ApiUnauthorizedResponse({
    description:
      'Refresh token khong hop le, het han, bi revoke hoac bi reuse.',
  })
  @ApiForbiddenResponse({
    description: 'Tai khoan khong o trang thai active.',
  })
  @RateLimit({ profile: 'auth' })
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.exposeAccessToken(
      await this.authRpcService.refresh({
        refreshToken: this.readRefreshTokenCookie(request),
      }),
      response,
    );
  }

  @ApiOperation({
    summary: 'Dang xuat va revoke session refresh token hien tai',
  })
  @ApiOkResponse({
    description: 'Dang xuat thanh cong.',
    type: LogoutResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token khong hop le hoac da bi reuse.',
  })
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
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
  changePassword(
    @CurrentUser() user: AuthUserResponseDto,
    @Body() dto: ChangePasswordDto,
  ) {
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
      message: 'Cấp quyền quản trị thành công.',
      user,
    };
  }

  private exposeAccessToken(
    tokenResponse: InternalTokenResponse,
    response: Response,
  ): RefreshResponseDto {
    this.setRefreshTokenCookie(response, tokenResponse.refreshToken);
    return {
      accessToken: tokenResponse.accessToken,
      user: tokenResponse.user,
    };
  }

  private exposeRegistration<
    T extends { registrationToken: string; registration: unknown },
  >(result: T, response: Response): Omit<T, 'registrationToken'> {
    this.setScopedAuthCookie(
      response,
      REGISTRATION_SESSION_COOKIE,
      result.registrationToken,
      24 * 60 * 60 * 1000,
    );
    return Object.fromEntries(
      Object.entries(result).filter(([key]) => key !== 'registrationToken'),
    ) as Omit<T, 'registrationToken'>;
  }

  private readRefreshTokenCookie(request: Request): string {
    return this.readCookie(
      request,
      REFRESH_TOKEN_COOKIE,
      'Missing refresh token',
    );
  }

  private readCookie(request: Request, name: string, message: string): string {
    const value = this.readOptionalCookie(request, name);
    if (!value) throw new UnauthorizedException(message);
    return value;
  }

  private readOptionalCookie(
    request: Request,
    name: string,
  ): string | undefined {
    return this.parseCookieHeader(request.headers.cookie)[name];
  }

  private setScopedAuthCookie(
    response: Response,
    name: string,
    value: string,
    maxAge: number,
  ) {
    response.cookie(name, value, {
      ...this.getRefreshTokenCookieOptions(),
      maxAge,
    });
  }

  private clearScopedAuthCookie(response: Response, name: string) {
    response.clearCookie(name, this.getRefreshTokenCookieOptions());
  }

  private setRefreshTokenCookie(response: Response, refreshToken: string) {
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...this.getRefreshTokenCookieOptions(),
      maxAge: this.getRefreshTokenMaxAgeMs(),
    });
  }

  private clearRefreshTokenCookie(response: Response) {
    response.clearCookie(
      REFRESH_TOKEN_COOKIE,
      this.getRefreshTokenCookieOptions(),
    );
  }

  private getRefreshTokenCookieOptions(): CookieOptions {
    const isProduction = this.isSecureCookieEnabled();
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: REFRESH_TOKEN_COOKIE_PATH,
    };
  }

  private parseCookieHeader(header?: string): Record<string, string> {
    return (header ?? '')
      .split(';')
      .reduce<Record<string, string>>((cookies, part) => {
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
    const ttl =
      this.configService.get<string>('REFRESH_TOKEN_TTL')?.trim() || '7d';
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
