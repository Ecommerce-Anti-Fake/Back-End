import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationRepository } from '../../infrastructure/persistence';
import { FirebaseTokenVerifierService } from '../services';
import { RegisterUseCase } from './register.use-case';

describe('RegisterUseCase', () => {
  const registrationRepositoryMock = {
    findAuthIdentity: jest.fn(),
    findUserByIdentifier: jest.fn(),
    upsertPendingRegistration: jest.fn(),
  };
  const firebaseTokenVerifierServiceMock = { verifyIdToken: jest.fn() };
  let useCase: RegisterUseCase;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUseCase,
        {
          provide: RegistrationRepository,
          useValue: registrationRepositoryMock,
        },
        {
          provide: FirebaseTokenVerifierService,
          useValue: firebaseTokenVerifierServiceMock,
        },
      ],
    }).compile();
    useCase = module.get(RegisterUseCase);
  });

  it('requires a Firebase Email/Password token', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-1',
      email: 'user@example.com',
      signInProvider: 'google.com',
    });

    await expect(
      useCase.execute({
        idToken: 'google-token',
        phone: '0901234567',
        displayName: 'User',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates only a pending registration and never creates a User', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-1',
      email: 'USER@example.com',
      signInProvider: 'password',
    });
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce(null);
    registrationRepositoryMock.findUserByIdentifier.mockResolvedValueOnce(null);
    registrationRepositoryMock.upsertPendingRegistration.mockResolvedValueOnce({
      id: 'pending-1',
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await useCase.execute({
      idToken: 'email-password-token',
      phone: '0901234567',
      displayName: ' Nguyen Van A ',
    });

    expect(
      registrationRepositoryMock.upsertPendingRegistration,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        firebaseUid: 'firebase-1',
        email: 'user@example.com',
        phone: '+84901234567',
        displayName: 'Nguyen Van A',
      }),
    );
    expect(result.registration).toMatchObject({
      email: 'user@example.com',
      phone: '+84901234567',
    });
  });

  it('is retryable for the same Firebase UID', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValue({
      uid: 'firebase-1',
      email: 'user@example.com',
      signInProvider: 'password',
    });
    registrationRepositoryMock.findAuthIdentity.mockResolvedValue(null);
    registrationRepositoryMock.findUserByIdentifier.mockResolvedValue(null);
    registrationRepositoryMock.upsertPendingRegistration.mockResolvedValue({
      id: 'pending-1',
      expiresAt: new Date(Date.now() + 60_000),
    });

    await useCase.execute({
      idToken: 'email-password-token',
      phone: '0901234567',
      displayName: 'User',
    });
    await useCase.execute({
      idToken: 'email-password-token',
      phone: '0901234567',
      displayName: 'User',
    });

    expect(
      registrationRepositoryMock.upsertPendingRegistration,
    ).toHaveBeenCalledTimes(2);
  });

  it('rejects an email or phone already owned by a User', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-1',
      email: 'user@example.com',
      signInProvider: 'password',
    });
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce(null);
    registrationRepositoryMock.findUserByIdentifier.mockResolvedValueOnce({
      id: 'user-1',
    });

    await expect(
      useCase.execute({
        idToken: 'email-password-token',
        phone: '0901234567',
        displayName: 'User',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
