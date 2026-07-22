import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
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
  const registrationRepositoryMock = { findAuthIdentity: jest.fn() };
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

  it('does not auto-create a user for an unlinked Google identity', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce(
      googleToken(),
    );
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce(null);

    await expect(useCase.execute({ idToken: 'google-token' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a linked Google identity while its local account is pending verification', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce(
      googleToken(),
    );
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce({
      user: createUserRecord({ accountStatus: 'pending_verification' }),
    });

    await expect(useCase.execute({ idToken: 'google-token' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('issues application tokens only for an active linked Google identity', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce(
      googleToken(),
    );
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce({
      user: createUserRecord(),
    });
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

    await expect(
      useCase.execute({ idToken: 'google-token' }),
    ).resolves.toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1', email: 'user@example.com' },
    });
  });

  function googleToken() {
    return {
      uid: 'firebase-1',
      email: 'user@example.com',
      emailVerified: true,
      signInProvider: 'google.com',
    };
  }
});

function createUserRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    phone: null,
    displayName: 'Google User',
    password: null,
    role: 'user',
    accountStatus: 'active',
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
