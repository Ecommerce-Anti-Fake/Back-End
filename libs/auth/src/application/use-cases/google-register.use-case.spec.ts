import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationRepository } from '../../infrastructure/persistence';
import {
  FirebaseTokenVerifierService,
  PasswordHasherService,
} from '../services';
import { GoogleRegisterUseCase } from './google-register.use-case';

describe('GoogleRegisterUseCase', () => {
  const registrationRepositoryMock = {
    findAuthIdentity: jest.fn(),
    findUserByIdentifier: jest.fn(),
    createGoogleRegistration: jest.fn(),
    createGoogleLinkIntent: jest.fn(),
    createRegistrationSession: jest.fn(),
    replaceExpiredGoogleRegistration: jest.fn(),
  };
  const firebaseTokenVerifierServiceMock = { verifyIdToken: jest.fn() };
  const passwordHasherServiceMock = { hashOpaqueToken: jest.fn() };
  let useCase: GoogleRegisterUseCase;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleRegisterUseCase,
        {
          provide: RegistrationRepository,
          useValue: registrationRepositoryMock,
        },
        {
          provide: FirebaseTokenVerifierService,
          useValue: firebaseTokenVerifierServiceMock,
        },
        { provide: PasswordHasherService, useValue: passwordHasherServiceMock },
      ],
    }).compile();
    useCase = module.get(GoogleRegisterUseCase);
  });

  it('requires a verified Google provider token', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-1',
      email: 'user@example.com',
      emailVerified: true,
      signInProvider: 'password',
    });

    await expect(
      useCase.execute({ idToken: 'email-link-token' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates a pending Google account that still requires email-link verification', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce(
      googleToken(),
    );
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce(null);
    registrationRepositoryMock.findUserByIdentifier.mockResolvedValueOnce(null);
    passwordHasherServiceMock.hashOpaqueToken.mockReturnValueOnce(
      'hashed-registration-secret',
    );
    registrationRepositoryMock.createGoogleRegistration.mockImplementationOnce(
      async (input) => ({
        user: { id: 'user-1', accountStatus: 'pending_verification' },
        session: { id: 'registration-1', expiresAt: input.sessionExpiresAt },
      }),
    );

    const result = await useCase.execute({ idToken: 'google-token' });

    expect(
      registrationRepositoryMock.createGoogleRegistration,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        firebaseUid: 'firebase-1',
        accountStatus: 'pending_verification',
        sessionProvider: 'GOOGLE',
      }),
    );
    expect(result.kind).toBe('PENDING_VERIFICATION');
    expect(result.registrationToken).toMatch(/^registration-1\./);
  });

  it('creates a one-use link intent when Google email belongs to an active local account', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce(
      googleToken(),
    );
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce(null);
    registrationRepositoryMock.findUserByIdentifier.mockResolvedValueOnce({
      id: 'local-user-1',
      email: 'user@example.com',
      accountStatus: 'active',
    });
    passwordHasherServiceMock.hashOpaqueToken.mockReturnValueOnce(
      'hashed-link-secret',
    );
    registrationRepositoryMock.createGoogleLinkIntent.mockImplementationOnce(
      async (input) => ({
        id: 'link-1',
        expiresAt: input.expiresAt,
      }),
    );

    const result = await useCase.execute({ idToken: 'google-token' });

    expect(result).toMatchObject({
      kind: 'LINK_REQUIRED',
      linkToken: expect.stringMatching(/^link-1\./),
      email: 'user@example.com',
    });
    expect(
      registrationRepositoryMock.createGoogleRegistration,
    ).not.toHaveBeenCalled();
  });

  it('resumes a pending Google registration only within its original 24-hour window', async () => {
    const createdAt = new Date(Date.now() - 60_000);
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce(
      googleToken(),
    );
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce({
      user: {
        id: 'user-1',
        accountStatus: 'pending_verification',
        createdAt,
      },
    });
    passwordHasherServiceMock.hashOpaqueToken.mockReturnValueOnce(
      'hashed-secret',
    );
    registrationRepositoryMock.createRegistrationSession.mockImplementationOnce(
      (input) =>
        Promise.resolve({ id: 'registration-2', expiresAt: input.expiresAt }),
    );

    await useCase.execute({ idToken: 'google-token' });

    expect(
      registrationRepositoryMock.createRegistrationSession,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
      }),
    );
  });

  it('replaces an expired pending Google registration instead of extending it indefinitely', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce(
      googleToken(),
    );
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce({
      user: {
        id: 'user-1',
        accountStatus: 'pending_verification',
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      },
    });
    passwordHasherServiceMock.hashOpaqueToken.mockReturnValueOnce(
      'hashed-secret',
    );
    registrationRepositoryMock.replaceExpiredGoogleRegistration.mockImplementationOnce(
      (input) =>
        Promise.resolve({
          session: { id: 'registration-3', expiresAt: input.sessionExpiresAt },
        }),
    );

    const result = await useCase.execute({ idToken: 'google-token' });

    expect(
      registrationRepositoryMock.replaceExpiredGoogleRegistration,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', email: 'user@example.com' }),
    );
    expect(result.registrationToken).toMatch(/^registration-3\./);
  });

  function googleToken() {
    return {
      uid: 'firebase-1',
      email: 'USER@example.com',
      emailVerified: true,
      signInProvider: 'google.com',
      name: 'Google User',
    };
  }
});
