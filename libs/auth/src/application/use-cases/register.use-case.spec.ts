import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PasswordHasherService } from '../services/password-hasher.service';
import { RegistrationRepository } from '../../infrastructure/persistence/registration.repository';
import { RegisterUseCase } from './register.use-case';

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;

  const registrationRepositoryMock = {
    findUserByIdentifier: jest.fn(),
    findGoogleIdentityByUserId: jest.fn(),
    createLocalRegistration: jest.fn(),
    createRegistrationSession: jest.fn(),
    replaceExpiredLocalRegistration: jest.fn(),
  };

  const passwordHasherServiceMock = {
    hashPassword: jest.fn(),
    hashOpaqueToken: jest.fn(),
    verifyPassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUseCase,
        {
          provide: RegistrationRepository,
          useValue: registrationRepositoryMock,
        },
        { provide: PasswordHasherService, useValue: passwordHasherServiceMock },
      ],
    }).compile();

    useCase = module.get<RegisterUseCase>(RegisterUseCase);
  });

  it('requires both email and phone for standard registration', async () => {
    await expect(
      useCase.execute({
        email: 'user@example.com',
        displayName: 'User',
        password: 'StrongPass123',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      useCase.execute({
        phone: '0901234567',
        displayName: 'User',
        password: 'StrongPass123',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns an account-link-required conflict when the email belongs to Google', async () => {
    registrationRepositoryMock.findUserByIdentifier.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      phone: null,
      accountStatus: 'active',
    });
    registrationRepositoryMock.findGoogleIdentityByUserId.mockResolvedValueOnce(
      {
        providerSubject: 'firebase-1',
      },
    );

    await expect(
      useCase.execute({
        email: 'user@example.com',
        phone: '0901234567',
        displayName: 'User',
        password: 'StrongPass123',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'ACCOUNT_EXISTS_WITH_GOOGLE',
      }),
    });
  });

  it('creates a pending local account and a 24-hour registration session', async () => {
    registrationRepositoryMock.findUserByIdentifier.mockResolvedValueOnce(null);
    passwordHasherServiceMock.hashPassword.mockResolvedValueOnce(
      'hashed-password',
    );
    passwordHasherServiceMock.hashOpaqueToken.mockReturnValueOnce(
      'hashed-registration-secret',
    );
    registrationRepositoryMock.createLocalRegistration.mockImplementationOnce(
      async (input) => ({
        user: {
          id: 'user-1',
          email: input.email,
          phone: input.phone,
          accountStatus: 'pending_verification',
        },
        session: { id: 'registration-1', expiresAt: input.sessionExpiresAt },
      }),
    );

    const result = await useCase.execute({
      email: 'USER@example.com',
      phone: '+84901234567',
      displayName: ' User ',
      password: 'StrongPass123',
    });

    expect(
      registrationRepositoryMock.createLocalRegistration,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        phone: '0901234567',
        displayName: 'User',
        password: 'hashed-password',
        accountStatus: 'pending_verification',
        sessionProvider: 'LOCAL',
        sessionPurpose: 'REGISTER',
        sessionTokenHash: 'hashed-registration-secret',
      }),
    );
    expect(result.registration).toEqual({
      provider: 'LOCAL',
      email: 'user@example.com',
      phone: '0901234567',
      expiresAt: expect.any(Date),
    });
    expect(result.registrationToken).toMatch(/^registration-1\./);
  });

  it('resumes the same pending registration within 24 hours when the password matches', async () => {
    registrationRepositoryMock.findUserByIdentifier.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      phone: '0901234567',
      password: 'hashed-password',
      accountStatus: 'pending_verification',
      createdAt: new Date(Date.now() - 60_000),
    });
    registrationRepositoryMock.findGoogleIdentityByUserId.mockResolvedValueOnce(
      null,
    );
    passwordHasherServiceMock.verifyPassword.mockResolvedValueOnce(true);
    passwordHasherServiceMock.hashOpaqueToken.mockReturnValueOnce(
      'hashed-registration-secret',
    );
    registrationRepositoryMock.createRegistrationSession.mockImplementationOnce(
      async (input) => ({
        id: 'registration-2',
        expiresAt: input.expiresAt,
      }),
    );

    const result = await useCase.execute({
      email: 'user@example.com',
      phone: '0901234567',
      displayName: 'User',
      password: 'StrongPass123',
    });

    expect(
      registrationRepositoryMock.createRegistrationSession,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', purpose: 'REGISTER' }),
    );
    expect(result.registrationToken).toMatch(/^registration-2\./);
  });

  it('replaces the same pending registration after its 24-hour window expires', async () => {
    registrationRepositoryMock.findUserByIdentifier.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      phone: '0901234567',
      password: 'old-hash',
      accountStatus: 'pending_verification',
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    });
    registrationRepositoryMock.findGoogleIdentityByUserId.mockResolvedValueOnce(
      null,
    );
    passwordHasherServiceMock.hashPassword.mockResolvedValueOnce('new-hash');
    passwordHasherServiceMock.hashOpaqueToken.mockReturnValueOnce(
      'hashed-registration-secret',
    );
    registrationRepositoryMock.replaceExpiredLocalRegistration.mockImplementationOnce(
      async (input) => ({
        session: { id: 'registration-3', expiresAt: input.sessionExpiresAt },
      }),
    );

    const result = await useCase.execute({
      email: 'user@example.com',
      phone: '0901234567',
      displayName: 'New Name',
      password: 'NewStrongPass123',
    });

    expect(
      registrationRepositoryMock.replaceExpiredLocalRegistration,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        email: 'user@example.com',
        phone: '0901234567',
        password: 'new-hash',
      }),
    );
    expect(result.registrationToken).toMatch(/^registration-3\./);
  });
});
