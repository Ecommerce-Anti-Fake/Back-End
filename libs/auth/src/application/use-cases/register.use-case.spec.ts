import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserIdentityPort } from '../../domain/interfaces';
import { PasswordHasherService } from '../services/password-hasher.service';
import { RegisterUseCase } from './register.use-case';

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;

  const userIdentityPortMock = {
    findByIdentifier: jest.fn(),
    create: jest.fn(),
  };

  const passwordHasherServiceMock = {
    hashPassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUseCase,
        { provide: UserIdentityPort, useValue: userIdentityPortMock },
        { provide: PasswordHasherService, useValue: passwordHasherServiceMock },
      ],
    }).compile();

    useCase = module.get<RegisterUseCase>(RegisterUseCase);
  });

  it('should reject when email and phone are both missing', async () => {
    await expect(useCase.execute({ password: '12345678' })).rejects.toThrow(BadRequestException);
  });

  it('should reject when email already exists', async () => {
    userIdentityPortMock.findByIdentifier.mockResolvedValueOnce({ id: 'existing-user' });

    await expect(
      useCase.execute({
        email: 'user@example.com',
        password: '12345678',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should create a user and return a safe user payload', async () => {
    userIdentityPortMock.findByIdentifier.mockResolvedValueOnce(null);
    passwordHasherServiceMock.hashPassword.mockResolvedValueOnce('hashed-password');
    userIdentityPortMock.create.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      phone: null,
      displayName: 'User',
      password: 'hashed-password',
      role: 'user',
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await useCase.execute({
      email: 'USER@example.com',
      displayName: 'User',
      password: '12345678',
    });

    expect(passwordHasherServiceMock.hashPassword).toHaveBeenCalledWith('12345678');
    expect(userIdentityPortMock.create).toHaveBeenCalledWith({
      email: 'user@example.com',
      phone: null,
      displayName: 'User',
      password: 'hashed-password',
    });
    expect(result).toMatchObject({
      id: 'user-1',
      email: 'user@example.com',
      role: 'user',
      accountStatus: 'active',
    });
    expect(result).not.toHaveProperty('password');
  });
});
