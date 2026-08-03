/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtTokenAdapter } from '../../infrastructure/adapters';
import {
  AuthSessionRepository,
  RegistrationRepository,
} from '../../infrastructure/persistence';
import {
  FirebaseTokenVerifierService,
  PasswordHasherService,
} from '../services';
import { FirebaseLoginUseCase } from './firebase-login.use-case';

describe('FirebaseLoginUseCase', () => {
  let useCase: FirebaseLoginUseCase;
  const registrationRepositoryMock = {
    findAuthIdentity: jest.fn(),
    findPendingRegistrationByFirebaseUid: jest.fn(),
    promotePendingRegistration: jest.fn(),
  };
  const authSessionRepositoryMock = { create: jest.fn(), update: jest.fn() };
  const passwordHasherServiceMock = { hashOpaqueToken: jest.fn() };
  const jwtTokenAdapterMock = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    calculateRefreshExpiry: jest.fn(),
    generateTokenId: jest.fn(),
  };
  const firebaseTokenVerifierServiceMock = { verifyIdToken: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirebaseLoginUseCase,
        {
          provide: RegistrationRepository,
          useValue: registrationRepositoryMock,
        },
        { provide: AuthSessionRepository, useValue: authSessionRepositoryMock },
        { provide: PasswordHasherService, useValue: passwordHasherServiceMock },
        { provide: JwtTokenAdapter, useValue: jwtTokenAdapterMock },
        {
          provide: FirebaseTokenVerifierService,
          useValue: firebaseTokenVerifierServiceMock,
        },
      ],
    }).compile();
    useCase = module.get(FirebaseLoginUseCase);
  });

  it('rejects a pending registration when the Firebase UID does not match', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-token',
      email: 'user@example.com',
      signInProvider: 'password',
    });
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce(null);
    registrationRepositoryMock.findPendingRegistrationByFirebaseUid.mockResolvedValueOnce(
      pending({ firebaseUid: 'firebase-pending' }),
    );

    await expect(useCase.execute({ idToken: 'token' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(
      registrationRepositoryMock.promotePendingRegistration,
    ).not.toHaveBeenCalled();
  });

  it('returns the stable code when a Google identity is not linked', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'google-1',
      email: 'user@example.com',
      emailVerified: true,
      signInProvider: 'google.com',
    });
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce(null);

    await expect(useCase.execute({ idToken: 'token' })).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'GOOGLE_ACCOUNT_NOT_LINKED',
      }),
    });
    expect(
      registrationRepositoryMock.findPendingRegistrationByFirebaseUid,
    ).not.toHaveBeenCalled();
  });

  it('does not promote when email verification is absent or email mismatches', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-1',
      email: 'other@example.com',
      emailVerified: true,
      signInProvider: 'password',
    });
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce(null);
    registrationRepositoryMock.findPendingRegistrationByFirebaseUid.mockResolvedValueOnce(
      pending(),
    );

    await expect(useCase.execute({ idToken: 'token' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(
      registrationRepositoryMock.promotePendingRegistration,
    ).not.toHaveBeenCalled();
  });

  it('promotes on a matching verified email token', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-1',
      email: 'USER@example.com',
      emailVerified: true,
      signInProvider: 'password',
    });
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce(null);
    registrationRepositoryMock.findPendingRegistrationByFirebaseUid.mockResolvedValueOnce(
      pending(),
    );
    registrationRepositoryMock.promotePendingRegistration.mockResolvedValueOnce(
      activeUser(),
    );
    configureSessionTokens();

    await useCase.execute({ idToken: 'token' });

    expect(
      registrationRepositoryMock.promotePendingRegistration,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        firebaseUid: 'firebase-1',
        email: 'user@example.com',
        phone: '0901234567',
        emailVerifiedAt: expect.any(Date),
        phoneVerifiedAt: null,
      }),
    );
  });

  it('promotes only when phone_number matches the pending E.164 phone', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-1',
      email: 'user@example.com',
      emailVerified: false,
      phoneNumber: '+84901234567',
      signInProvider: 'phone',
    });
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce(null);
    registrationRepositoryMock.findPendingRegistrationByFirebaseUid.mockResolvedValueOnce(
      pending(),
    );
    registrationRepositoryMock.promotePendingRegistration.mockResolvedValueOnce(
      activeUser(),
    );
    configureSessionTokens();

    await useCase.execute({ idToken: 'token' });

    expect(
      registrationRepositoryMock.promotePendingRegistration,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '0901234567',
        emailVerifiedAt: null,
        phoneVerifiedAt: expect.any(Date),
      }),
    );
  });

  it('rejects a phone token with a different phone number', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-1',
      email: 'user@example.com',
      phoneNumber: '+84909999999',
      signInProvider: 'phone',
    });
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce(null);
    registrationRepositoryMock.findPendingRegistrationByFirebaseUid.mockResolvedValueOnce(
      pending(),
    );

    await expect(useCase.execute({ idToken: 'token' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(
      registrationRepositoryMock.promotePendingRegistration,
    ).not.toHaveBeenCalled();
  });

  it('rejects a phone verification token without phone_number', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-1',
      email: 'user@example.com',
      emailVerified: false,
      signInProvider: 'password',
    });
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce(null);
    registrationRepositoryMock.findPendingRegistrationByFirebaseUid.mockResolvedValueOnce(
      pending(),
    );

    await expect(useCase.execute({ idToken: 'token' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(
      registrationRepositoryMock.promotePendingRegistration,
    ).not.toHaveBeenCalled();
  });

  it('reuses the identity if promotion races with another request', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-1',
      email: 'user@example.com',
      emailVerified: true,
      signInProvider: 'password',
    });
    registrationRepositoryMock.findAuthIdentity
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ user: activeUser() });
    registrationRepositoryMock.findPendingRegistrationByFirebaseUid.mockResolvedValueOnce(
      pending(),
    );
    registrationRepositoryMock.promotePendingRegistration.mockRejectedValueOnce(
      new ConflictException('unique constraint'),
    );
    configureSessionTokens();

    const result = await useCase.execute({ idToken: 'token' });

    expect(result.user).toMatchObject({ id: 'user-1' });
  });

  it('rejects an expired pending registration', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-1',
      email: 'user@example.com',
      emailVerified: true,
      signInProvider: 'password',
    });
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce(null);
    registrationRepositoryMock.findPendingRegistrationByFirebaseUid.mockResolvedValueOnce(
      pending({ expiresAt: new Date(Date.now() - 1) }),
    );

    await expect(useCase.execute({ idToken: 'token' })).rejects.toThrow(
      ConflictException,
    );
  });

  function configureSessionTokens() {
    authSessionRepositoryMock.create.mockResolvedValueOnce({ id: 'session-1' });
    authSessionRepositoryMock.update.mockResolvedValueOnce({});
    jwtTokenAdapterMock.generateAccessToken.mockResolvedValueOnce(
      'access-token',
    );
    jwtTokenAdapterMock.generateTokenId
      .mockReturnValueOnce('refresh-token-id')
      .mockReturnValueOnce('token-family-id');
    jwtTokenAdapterMock.calculateRefreshExpiry.mockReturnValueOnce(
      new Date(Date.now() + 60_000),
    );
    jwtTokenAdapterMock.generateRefreshToken.mockResolvedValueOnce(
      'refresh-token',
    );
    passwordHasherServiceMock.hashOpaqueToken.mockReturnValueOnce(
      'hashed-refresh-token',
    );
  }
});

function pending(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pending-1',
    firebaseUid: 'firebase-1',
    email: 'user@example.com',
    phone: '+84901234567',
    displayName: 'User',
    expiresAt: new Date(Date.now() + 60_000),
    completedAt: null,
    ...overrides,
  };
}

function activeUser() {
  return {
    id: 'user-1',
    email: 'user@example.com',
    phone: '0901234567',
    displayName: 'User',
    avatar: null,
    role: 'user',
    accountStatus: 'active',
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
