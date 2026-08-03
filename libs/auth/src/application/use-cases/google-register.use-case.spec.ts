import { ForbiddenException } from '@nestjs/common';
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
import { GoogleRegisterUseCase } from './google-register.use-case';

describe('GoogleRegisterUseCase', () => {
  const registrationRepositoryMock = { createOrLinkGoogleUser: jest.fn() };
  const firebaseTokenVerifierServiceMock = { verifyIdToken: jest.fn() };
  const authSessionRepositoryMock = { create: jest.fn(), update: jest.fn() };
  const passwordHasherServiceMock = { hashOpaqueToken: jest.fn() };
  const jwtTokenAdapterMock = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    calculateRefreshExpiry: jest.fn(),
    generateTokenId: jest.fn(),
  };
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
        { provide: AuthSessionRepository, useValue: authSessionRepositoryMock },
        { provide: PasswordHasherService, useValue: passwordHasherServiceMock },
        { provide: JwtTokenAdapter, useValue: jwtTokenAdapterMock },
      ],
    }).compile();
    useCase = module.get(GoogleRegisterUseCase);
  });

  it('requires a verified Google provider token', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-1',
      email: 'user@example.com',
      emailVerified: false,
      signInProvider: 'google.com',
    });

    await expect(useCase.execute({ idToken: 'google-token' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('creates a verified Google account immediately', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-1',
      email: 'USER@example.com',
      emailVerified: true,
      signInProvider: 'google.com',
      name: 'Google User',
    });
    registrationRepositoryMock.createOrLinkGoogleUser.mockResolvedValueOnce(
      activeUser(),
    );
    configureSessionTokens();

    const result = await useCase.execute({ idToken: 'google-token' });

    expect(
      registrationRepositoryMock.createOrLinkGoogleUser,
    ).toHaveBeenCalledWith({
      email: 'user@example.com',
      displayName: 'Google User',
      firebaseUid: 'firebase-1',
    });
    expect(result).toMatchObject({
      accessToken: 'access-token',
      user: { id: 'user-1', email: 'user@example.com' },
    });
  });

  it('uses the same create/link path on retry', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValue({
      uid: 'firebase-1',
      email: 'user@example.com',
      emailVerified: true,
      signInProvider: 'google.com',
    });
    registrationRepositoryMock.createOrLinkGoogleUser.mockResolvedValue(
      activeUser(),
    );
    configureSessionTokens();
    configureSessionTokens();

    await useCase.execute({ idToken: 'google-token' });
    await useCase.execute({ idToken: 'google-token' });

    expect(
      registrationRepositoryMock.createOrLinkGoogleUser,
    ).toHaveBeenCalledTimes(2);
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

function activeUser() {
  return {
    id: 'user-1',
    email: 'user@example.com',
    phone: null,
    displayName: 'Google User',
    avatar: null,
    role: 'user',
    accountStatus: 'active',
    emailVerifiedAt: new Date(),
    phoneVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
