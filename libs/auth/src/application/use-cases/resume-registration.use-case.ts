import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { UserIdentityPort } from '@contracts';
import { RegistrationRepository } from '../../infrastructure/persistence';
import { LoginDto } from '../dto';
import { PasswordHasherService } from '../services';
import { toLoginIdentifier } from './auth-identifier.mapper';

const REGISTRATION_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ResumeRegistrationUseCase {
  constructor(
    private readonly userIdentityPort: UserIdentityPort,
    private readonly registrationRepository: RegistrationRepository,
    private readonly passwordHasherService: PasswordHasherService,
  ) {}

  async execute(dto: LoginDto) {
    const identifier = toLoginIdentifier(dto.username);
    const user = await this.userIdentityPort.findByIdentifier(identifier);
    if (!user?.password || user.accountStatus !== 'pending_verification') {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordMatches = await this.passwordHasherService.verifyPassword(
      dto.password,
      user.password,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const createdAt = new Date(user.createdAt ?? 0);
    const expiresAt = new Date(createdAt.getTime() + REGISTRATION_TTL_MS);
    if (
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      throw new ConflictException({
        statusCode: 409,
        error: 'REGISTRATION_EXPIRED',
        message: 'Phien dang ky da het han. Vui long dang ky lai.',
      });
    }

    const secret = randomBytes(32).toString('base64url');
    const session = await this.registrationRepository.createRegistrationSession(
      {
        userId: user.id,
        provider: 'LOCAL',
        purpose: 'REGISTER',
        tokenHash: this.passwordHasherService.hashOpaqueToken(secret),
        expiresAt,
      },
    );
    return {
      registrationToken: `${session.id}.${secret}`,
      registration: {
        provider: 'LOCAL' as const,
        email: user.email,
        phone: user.phone,
        expiresAt: session.expiresAt,
      },
    };
  }
}
