import { Controller, ForbiddenException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_MESSAGE_PATTERNS } from '@contracts';
import { throwRpcException } from '@common';
import type { AuthenticatedPrincipal } from '@contracts';
import {
  ChangePasswordDto,
  ConfirmRegistrationChallengeDto,
  CreateRegistrationChallengeDto,
  FirebaseLoginDto,
  ForgotPasswordDto,
  GoogleRegisterDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  SetLocalCredentialsDto,
} from '../../application/dto';
import {
  ChangePasswordUseCase,
  ConfirmGoogleLinkUseCase,
  ConfirmRegistrationChallengeUseCase,
  CreateRegistrationChallengeUseCase,
  FirebaseLoginUseCase,
  GetEmailVerificationContextUseCase,
  GetRegistrationSessionUseCase,
  GoogleRegisterUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  RegisterUseCase,
  ResumeRegistrationUseCase,
  RequestPasswordResetUseCase,
  ResetPasswordUseCase,
  ResendRegistrationChallengeUseCase,
  SetLocalCredentialsUseCase,
} from '../../application/use-cases';

@Controller()
export class AuthRpcController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly googleRegisterUseCase: GoogleRegisterUseCase,
    private readonly resumeRegistrationUseCase: ResumeRegistrationUseCase,
    private readonly getRegistrationSessionUseCase: GetRegistrationSessionUseCase,
    private readonly getEmailVerificationContextUseCase: GetEmailVerificationContextUseCase,
    private readonly createRegistrationChallengeUseCase: CreateRegistrationChallengeUseCase,
    private readonly resendRegistrationChallengeUseCase: ResendRegistrationChallengeUseCase,
    private readonly confirmRegistrationChallengeUseCase: ConfirmRegistrationChallengeUseCase,
    private readonly confirmGoogleLinkUseCase: ConfirmGoogleLinkUseCase,
    private readonly setLocalCredentialsUseCase: SetLocalCredentialsUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly firebaseLoginUseCase: FirebaseLoginUseCase,
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

  @MessagePattern(AUTH_MESSAGE_PATTERNS.googleRegister)
  async googleRegister(@Payload() dto: GoogleRegisterDto) {
    try {
      return await this.googleRegisterUseCase.execute(dto);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.resumeRegistration)
  async resumeRegistration(@Payload() dto: LoginDto) {
    try {
      return await this.resumeRegistrationUseCase.execute(dto);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.getRegistrationSession)
  async getRegistrationSession(
    @Payload() payload: { registrationToken: string },
  ) {
    try {
      return await this.getRegistrationSessionUseCase.execute(
        payload.registrationToken,
      );
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.getEmailVerificationContext)
  async getEmailVerificationContext(
    @Payload() payload: { challengeId: string; state: string },
  ) {
    try {
      return await this.getEmailVerificationContextUseCase.execute(
        payload.challengeId,
        payload.state,
      );
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.createRegistrationChallenge)
  async createRegistrationChallenge(
    @Payload()
    payload: {
      registrationToken: string;
      dto: CreateRegistrationChallengeDto;
    },
  ) {
    try {
      return await this.createRegistrationChallengeUseCase.execute(
        payload.registrationToken,
        payload.dto,
      );
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.resendRegistrationChallenge)
  async resendRegistrationChallenge(
    @Payload() payload: { registrationToken: string; challengeId: string },
  ) {
    try {
      return await this.resendRegistrationChallengeUseCase.execute(
        payload.registrationToken,
        payload.challengeId,
      );
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.confirmRegistrationChallenge)
  async confirmRegistrationChallenge(
    @Payload()
    payload: {
      registrationToken?: string;
      challengeId: string;
      dto: ConfirmRegistrationChallengeDto;
    },
  ) {
    try {
      return await this.confirmRegistrationChallengeUseCase.execute({
        registrationToken: payload.registrationToken,
        challengeId: payload.challengeId,
        ...payload.dto,
      });
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.confirmGoogleLink)
  async confirmGoogleLink(
    @Payload() payload: { userId: string; linkToken: string },
  ) {
    try {
      return await this.confirmGoogleLinkUseCase.execute(
        payload.userId,
        payload.linkToken,
      );
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(AUTH_MESSAGE_PATTERNS.setLocalCredentials)
  async setLocalCredentials(
    @Payload() payload: { userId: string; dto: SetLocalCredentialsDto },
  ) {
    try {
      return await this.setLocalCredentialsUseCase.execute(
        payload.userId,
        payload.dto,
      );
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

  @MessagePattern(AUTH_MESSAGE_PATTERNS.firebaseLogin)
  async firebaseLogin(@Payload() dto: FirebaseLoginDto) {
    try {
      return await this.firebaseLoginUseCase.execute(dto);
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
  async changePassword(
    @Payload() payload: { userId: string; dto: ChangePasswordDto },
  ) {
    try {
      return await this.changePasswordUseCase.execute(
        payload.userId,
        payload.dto,
      );
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
        message: 'Cấp quyền quản trị thành công.',
        user,
      };
    } catch (error) {
      throwRpcException(error);
    }
  }
}
