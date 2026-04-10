import { Injectable } from '@nestjs/common';
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

@Injectable()
export class PasswordHasherService {
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  async verifyPassword(password: string, stored: string): Promise<boolean> {
    return this.verifyHashedValue(password, stored);
  }

  hashOpaqueToken(value: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(value, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  verifyHashedValue(rawValue: string, stored: string): boolean {
    const [storedSalt, storedHash] = stored.split(':');
    if (!storedSalt || !storedHash) {
      return false;
    }

    const candidateHash = pbkdf2Sync(rawValue, storedSalt, 10000, 64, 'sha512').toString('hex');

    try {
      return timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(candidateHash, 'hex'));
    } catch {
      return false;
    }
  }
}
