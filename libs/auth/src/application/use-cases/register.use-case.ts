import { BadRequestException, Injectable } from '@nestjs/common';
import { RegisterDto } from '../dto';
import { UserIdentityPort } from '@contracts';
import { PasswordHasherService } from '../services';
import { toSafeUser } from './user.mapper';

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly userIdentityPort: UserIdentityPort,
    private readonly passwordHasherService: PasswordHasherService,
  ) {}

  async execute(dto: RegisterDto) {
    const email = this.normalizeEmail(dto.email);
    const phone = this.normalizePhone(dto.phone);
    const displayName = dto.displayName?.trim() || null;
    const { password } = dto;

    if (!email && !phone) {
      throw new BadRequestException('Either email or phone must be provided');
    }

    const existing = await this.userIdentityPort.findByIdentifier({ email, phone });
    if (existing) {
      throw new BadRequestException('A user with that email or phone already exists');
    }

    const passwordHash = await this.passwordHasherService.hashPassword(password);
    const user = await this.userIdentityPort.create({
      email,
      phone,
      displayName,
      password: passwordHash,
    });

    return toSafeUser(user);
  }


  private normalizeEmail(email?: string): string | null {
    const normalized = email?.trim().toLowerCase();
    return normalized || null;
  }

  private normalizePhone(phone?: string): string | null {
    const normalized = phone?.trim();
    return normalized || null;
  }
}
