import { Test, TestingModule } from '@nestjs/testing';
import { UserIdentityPort } from '@contracts';
import { RegistrationRepository } from '../../infrastructure/persistence';
import { PasswordHasherService } from '../services';
import { ResumeRegistrationUseCase } from './resume-registration.use-case';

describe('ResumeRegistrationUseCase', () => {
  const now = new Date('2026-07-22T10:00:00.000Z');
  const userIdentityPortMock = { findByIdentifier: jest.fn() };
  const registrationRepositoryMock = { createRegistrationSession: jest.fn() };
  const passwordHasherServiceMock = {
    verifyPassword: jest.fn(),
    hashOpaqueToken: jest.fn(),
  };
  let useCase: ResumeRegistrationUseCase;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(now.getTime());
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeRegistrationUseCase,
        { provide: UserIdentityPort, useValue: userIdentityPortMock },
        {
          provide: RegistrationRepository,
          useValue: registrationRepositoryMock,
        },
        { provide: PasswordHasherService, useValue: passwordHasherServiceMock },
      ],
    }).compile();
    useCase = module.get(ResumeRegistrationUseCase);
  });

  afterEach(() => jest.useRealTimers());

  it('issues a new registration session after a pending user proves the password', async () => {
    userIdentityPortMock.findByIdentifier.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      phone: '0901234567',
      password: 'stored-hash',
      accountStatus: 'pending_verification',
      createdAt: new Date(now.getTime() - 60_000),
    });
    passwordHasherServiceMock.verifyPassword.mockResolvedValueOnce(true);
    passwordHasherServiceMock.hashOpaqueToken.mockReturnValueOnce(
      'hashed-secret',
    );
    registrationRepositoryMock.createRegistrationSession.mockImplementationOnce(
      async (input) => ({
        id: 'registration-2',
        expiresAt: input.expiresAt,
      }),
    );

    const result = await useCase.execute({
      username: 'user@example.com',
      password: 'StrongPass123',
    });

    expect(result.registrationToken).toMatch(/^registration-2\./);
    expect(result.registration).toMatchObject({
      provider: 'LOCAL',
      email: 'user@example.com',
      phone: '0901234567',
    });
  });

  it('rejects a pending registration older than 24 hours', async () => {
    userIdentityPortMock.findByIdentifier.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      phone: '0901234567',
      password: 'stored-hash',
      accountStatus: 'pending_verification',
      createdAt: new Date(now.getTime() - 86_400_001),
    });
    passwordHasherServiceMock.verifyPassword.mockResolvedValueOnce(true);

    await expect(
      useCase.execute({
        username: 'user@example.com',
        password: 'StrongPass123',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'REGISTRATION_EXPIRED' }),
    });
  });
});
