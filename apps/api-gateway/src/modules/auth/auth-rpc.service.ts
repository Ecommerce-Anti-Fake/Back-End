import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_MESSAGE_PATTERNS, AUTH_SERVICE_CLIENT } from '@contracts';
import {
  AccountSecurityResponseDto,
  AuthUserResponseDto,
  ConfirmRegistrationChallengeDto,
  CreateRegistrationChallengeDto,
  FirebaseLoginDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  GoogleRegisterDto,
  LoginDto,
  LogoutResponseDto,
  RefreshTokenDto,
  RegisterDto,
  RegisterResponseDto,
  ResetPasswordDto,
  ChangePasswordDto,
  SetLocalCredentialsDto,
} from '@auth';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

type InternalTokenResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponseDto;
};

type InternalRegistrationResponse = {
  registrationToken: string;
  registration: {
    provider: 'LOCAL' | 'GOOGLE';
    purpose?: string;
    email: string | null;
    phone: string | null;
    expiresAt: Date;
  };
};

type InternalGoogleRegisterResponse =
  | ({ kind: 'PENDING_VERIFICATION' } & InternalRegistrationResponse)
  | {
      kind: 'LINK_REQUIRED';
      linkToken: string;
      email: string;
      expiresAt: Date;
    };

@Injectable()
export class AuthRpcService {
  constructor(
    @Inject(AUTH_SERVICE_CLIENT)
    private readonly authClient: ClientProxy,
  ) {}

  register(dto: RegisterDto) {
    return this.send<InternalRegistrationResponse>(
      AUTH_MESSAGE_PATTERNS.register,
      dto,
    );
  }

  googleRegister(dto: GoogleRegisterDto) {
    return this.send<InternalGoogleRegisterResponse>(
      AUTH_MESSAGE_PATTERNS.googleRegister,
      dto,
    );
  }

  resumeRegistration(dto: LoginDto) {
    return this.send<InternalRegistrationResponse>(
      AUTH_MESSAGE_PATTERNS.resumeRegistration,
      dto,
    );
  }

  getRegistrationSession(registrationToken: string) {
    return this.send<RegisterResponseDto>(
      AUTH_MESSAGE_PATTERNS.getRegistrationSession,
      {
        registrationToken,
      },
    );
  }

  getEmailVerificationContext(challengeId: string, state: string) {
    return this.send<{ challengeId: string; email: string; expiresAt: Date }>(
      AUTH_MESSAGE_PATTERNS.getEmailVerificationContext,
      { challengeId, state },
    );
  }

  createRegistrationChallenge(
    registrationToken: string,
    dto: CreateRegistrationChallengeDto,
  ) {
    return this.send(AUTH_MESSAGE_PATTERNS.createRegistrationChallenge, {
      registrationToken,
      dto,
    });
  }

  resendRegistrationChallenge(registrationToken: string, challengeId: string) {
    return this.send(AUTH_MESSAGE_PATTERNS.resendRegistrationChallenge, {
      registrationToken,
      challengeId,
    });
  }

  confirmRegistrationChallenge(
    registrationToken: string | undefined,
    challengeId: string,
    dto: ConfirmRegistrationChallengeDto,
  ) {
    return this.send<{ success: true; message: string }>(
      AUTH_MESSAGE_PATTERNS.confirmRegistrationChallenge,
      { registrationToken, challengeId, dto },
    );
  }

  confirmGoogleLink(userId: string, linkToken: string) {
    return this.send<
      | { success: true; message: string }
      | ({
          success: false;
          verificationRequired: true;
        } & InternalRegistrationResponse)
    >(AUTH_MESSAGE_PATTERNS.confirmGoogleLink, { userId, linkToken });
  }

  setLocalCredentials(userId: string, dto: SetLocalCredentialsDto) {
    return this.send<InternalRegistrationResponse>(
      AUTH_MESSAGE_PATTERNS.setLocalCredentials,
      {
        userId,
        dto,
      },
    );
  }

  login(dto: LoginDto) {
    return this.send<InternalTokenResponse>(AUTH_MESSAGE_PATTERNS.login, dto);
  }

  firebaseLogin(dto: FirebaseLoginDto) {
    return this.send<InternalTokenResponse>(
      AUTH_MESSAGE_PATTERNS.firebaseLogin,
      dto,
    );
  }

  refresh(dto: RefreshTokenDto) {
    return this.send<InternalTokenResponse>(AUTH_MESSAGE_PATTERNS.refresh, dto);
  }

  logout(dto: RefreshTokenDto) {
    return this.send<LogoutResponseDto>(AUTH_MESSAGE_PATTERNS.logout, dto);
  }

  requestPasswordReset(dto: ForgotPasswordDto) {
    return this.send<ForgotPasswordResponseDto>(
      AUTH_MESSAGE_PATTERNS.requestPasswordReset,
      dto,
    );
  }

  resetPassword(dto: ResetPasswordDto) {
    return this.send<AccountSecurityResponseDto>(
      AUTH_MESSAGE_PATTERNS.resetPassword,
      dto,
    );
  }

  changePassword(userId: string, dto: ChangePasswordDto) {
    return this.send<AccountSecurityResponseDto>(
      AUTH_MESSAGE_PATTERNS.changePassword,
      { userId, dto },
    );
  }

  private async send<TResult>(
    pattern: string,
    payload: unknown,
  ): Promise<TResult> {
    try {
      return await lastValueFrom(
        this.authClient.send<TResult, unknown>(pattern, payload),
      );
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
