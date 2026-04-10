import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';

@Injectable()
export class UsersIdentityService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findById(id: string) {
    return this.usersRepository.findById(id);
  }

  findByIdentifier(identifier: { email?: string | null; phone?: string | null }) {
    return this.usersRepository.findByIdentifier(identifier);
  }

  create(data: {
    email: string | null;
    phone: string | null;
    displayName: string | null;
    password: string;
  }) {
    return this.usersRepository.create(data);
  }
}
