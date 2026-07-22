import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { RegisterDto } from '../dto';
import { PasswordHasherService } from '../services';
import { RegistrationRepository } from '../../infrastructure/persistence';
import { normalizeEmail, normalizePhone } from './auth-identifier.mapper';

const REGISTRATION_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly registrationRepository: RegistrationRepository,
    private readonly passwordHasherService: PasswordHasherService,
  ) {}

  async execute(dto: RegisterDto) {
    const email = normalizeEmail(dto.email);
    const phone = normalizePhone(dto.phone);
    const displayName = dto.displayName?.trim();

    if (!email || !phone) {
      throw new BadRequestException('Email and phone are required');
    }
    if (!displayName) {
      throw new BadRequestException('Display name is required');
    }

    const existing = await this.registrationRepository.findUserByIdentifier({
      email,
      phone,
    });
    if (existing) {
      const googleIdentity =
        await this.registrationRepository.findGoogleIdentityByUserId(
          existing.id,
        );
      if (googleIdentity && existing.email === email) {
        throw new ConflictException({
          statusCode: 409,
          error: 'ACCOUNT_EXISTS_WITH_GOOGLE',
          message:
            'Email nay da duoc dang ky bang Google. Vui long dang nhap Google de them mat khau.',
        });
      }

      const isSamePendingRegistration =
        existing.accountStatus === 'pending_verification' &&
        existing.email === email &&
        existing.phone === phone &&
        Boolean(existing.password);
      if (isSamePendingRegistration) {
        const originalExpiry = new Date(
          new Date(existing.createdAt).getTime() + REGISTRATION_TTL_MS,
        );
        if (originalExpiry.getTime() > Date.now()) {
          const passwordMatches =
            await this.passwordHasherService.verifyPassword(
              dto.password,
              existing.password!,
            );
          if (passwordMatches) {
            return this.createResumedSession(
              existing.id,
              email,
              phone,
              originalExpiry,
            );
          }
        } else {
          return this.replaceExpiredRegistration({
            userId: existing.id,
            email,
            phone,
            displayName,
            password: dto.password,
          });
        }
      }

      throw new ConflictException({
        statusCode: 409,
        error: 'ACCOUNT_ALREADY_EXISTS',
        message: 'Email hoac so dien thoai da duoc su dung.',
      });
    }

    const password = await this.passwordHasherService.hashPassword(
      dto.password,
    );
    const secret = randomBytes(32).toString('base64url');
    const sessionExpiresAt = new Date(Date.now() + REGISTRATION_TTL_MS);
    const { session } =
      await this.registrationRepository.createLocalRegistration({
        email,
        phone,
        displayName,
        password,
        accountStatus: 'pending_verification',
        sessionProvider: 'LOCAL',
        sessionPurpose: 'REGISTER',
        sessionTokenHash: this.passwordHasherService.hashOpaqueToken(secret),
        sessionExpiresAt,
      });

    return {
      registrationToken: `${session.id}.${secret}`,
      registration: {
        provider: 'LOCAL' as const,
        email,
        phone,
        expiresAt: session.expiresAt,
      },
    };
  }

  private async createResumedSession(
    userId: string,
    email: string,
    phone: string,
    expiresAt: Date,
  ) {
    const secret = randomBytes(32).toString('base64url');
    const session = await this.registrationRepository.createRegistrationSession(
      {
        userId,
        provider: 'LOCAL',
        purpose: 'REGISTER',
        tokenHash: this.passwordHasherService.hashOpaqueToken(secret),
        expiresAt,
      },
    );
    return this.registrationResponse(
      session.id,
      secret,
      email,
      phone,
      session.expiresAt,
    );
  }

  private async replaceExpiredRegistration(input: {
    userId: string;
    email: string;
    phone: string;
    displayName: string;
    password: string;
  }) {
    const secret = randomBytes(32).toString('base64url');
    const sessionExpiresAt = new Date(Date.now() + REGISTRATION_TTL_MS);
    const { session } =
      await this.registrationRepository.replaceExpiredLocalRegistration({
        ...input,
        password: await this.passwordHasherService.hashPassword(input.password),
        sessionTokenHash: this.passwordHasherService.hashOpaqueToken(secret),
        sessionExpiresAt,
      });
    return this.registrationResponse(
      session.id,
      secret,
      input.email,
      input.phone,
      session.expiresAt,
    );
  }

  private registrationResponse(
    sessionId: string,
    secret: string,
    email: string,
    phone: string,
    expiresAt: Date,
  ) {
    return {
      registrationToken: `${sessionId}.${secret}`,
      registration: {
        provider: 'LOCAL' as const,
        email,
        phone,
        expiresAt,
      },
    };
  }
}
