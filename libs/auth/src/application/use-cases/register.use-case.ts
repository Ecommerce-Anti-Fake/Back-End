import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RegisterDto } from '../dto';
import { FirebaseTokenVerifierService } from '../services';
import { RegistrationRepository } from '../../infrastructure/persistence';
import {
  normalizeEmail,
  normalizePhone,
  normalizePhoneE164,
} from './auth-identifier.mapper';

const REGISTRATION_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly registrationRepository: RegistrationRepository,
    private readonly firebaseTokenVerifierService: FirebaseTokenVerifierService,
  ) {}

  async execute(dto: RegisterDto) {
    const token = await this.firebaseTokenVerifierService.verifyIdToken(
      dto.idToken,
    );
    if (token.signInProvider !== 'password' || !token.email) {
      throw new ForbiddenException('Firebase Email/Password token is required');
    }

    const email = normalizeEmail(token.email);
    const phone = normalizePhoneE164(dto.phone);
    const localPhone = normalizePhone(dto.phone);
    const displayName = dto.displayName?.trim();

    if (!email || !phone || !localPhone) {
      throw new BadRequestException('Email and phone are required');
    }
    if (!displayName) {
      throw new BadRequestException('Display name is required');
    }

    const existingIdentity = await this.registrationRepository.findAuthIdentity(
      'FIREBASE',
      token.uid,
    );
    if (existingIdentity) {
      throw new ConflictException({
        statusCode: 409,
        error: 'ACCOUNT_ALREADY_EXISTS',
        message: 'Firebase user da duoc lien ket voi tai khoan AntiFake.',
      });
    }

    const existingUser = await this.registrationRepository.findUserByIdentifier(
      {
        email,
        phone: localPhone,
      },
    );
    if (existingUser) {
      throw new ConflictException({
        statusCode: 409,
        error: 'ACCOUNT_ALREADY_EXISTS',
        message: 'Email hoac so dien thoai da duoc su dung.',
      });
    }

    const session = await this.registrationRepository.upsertPendingRegistration(
      {
        firebaseUid: token.uid,
        email,
        phone,
        displayName,
        expiresAt: new Date(Date.now() + REGISTRATION_TTL_MS),
      },
    );

    return {
      registration: {
        provider: 'LOCAL' as const,
        email,
        phone,
        expiresAt: session.expiresAt,
      },
    };
  }
}
