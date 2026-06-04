import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserIdentityPort } from '@contracts';
import { JwtTokenAdapter } from '../../infrastructure/adapters';
import { AuthSessionRepository } from '../../infrastructure/persistence/auth-session.repository';
import { FirebaseTokenVerifierService, PasswordHasherService } from '../services';
import { FirebaseLoginUseCase } from './firebase-login.use-case';

describe('FirebaseLoginUseCase', () => {
  let useCase: FirebaseLoginUseCase;

  const userIdentityPortMock = {
    findByIdentifier: jest.fn(),
    create: jest.fn(),
  };

  const authSessionRepositoryMock = {
    create: jest.fn(),
    update: jest.fn(),
  };

  const passwordHasherServiceMock = {
    hashPassword: jest.fn(),
    hashOpaqueToken: jest.fn(),
  };

  const jwtTokenAdapterMock = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    calculateRefreshExpiry: jest.fn(),
    generateTokenId: jest.fn(),
  };

  const firebaseTokenVerifierServiceMock = {
    verifyIdToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirebaseLoginUseCase,
        { provide: UserIdentityPort, useValue: userIdentityPortMock },
        { provide: AuthSessionRepository, useValue: authSessionRepositoryMock },
        { provide: PasswordHasherService, useValue: passwordHasherServiceMock },
        { provide: JwtTokenAdapter, useValue: jwtTokenAdapterMock },
        { provide: FirebaseTokenVerifierService, useValue: firebaseTokenVerifierServiceMock },
      ],
    }).compile();

    useCase = module.get<FirebaseLoginUseCase>(FirebaseLoginUseCase);
  });

  it('rejects email-only Firebase tokens when email is not verified', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-1',
      email: 'user@example.com',
      emailVerified: false,
    });

    await expect(useCase.execute({ idToken: 'firebase-token' })).rejects.toThrow(ForbiddenException);
  });

  it('creates a local user for a verified Firebase email token and issues internal tokens', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-1',
      email: 'USER@example.com',
      emailVerified: true,
      name: 'Firebase User',
    });
    userIdentityPortMock.findByIdentifier.mockResolvedValueOnce(null);
    passwordHasherServiceMock.hashPassword.mockResolvedValueOnce('random-password-hash');
    userIdentityPortMock.create.mockResolvedValueOnce(createUserRecord());
    mockTokenIssue();

    const result = await useCase.execute({ idToken: 'firebase-token' });

    expect(userIdentityPortMock.create).toHaveBeenCalledWith({
      email: 'user@example.com',
      phone: null,
      displayName: 'Firebase User',
      password: 'random-password-hash',
    });
    expect(result).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
      },
    });
  });

  it('uses phone number from a verified Firebase phone token', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-phone-1',
      phoneNumber: '+84901234567',
    });
    userIdentityPortMock.findByIdentifier.mockResolvedValueOnce(createUserRecord({ phone: '+84901234567' }));
    mockTokenIssue();

    const result = await useCase.execute({ idToken: 'firebase-token' });

    expect(userIdentityPortMock.findByIdentifier).toHaveBeenCalledWith({
      email: null,
      phone: '+84901234567',
    });
    expect(result.user.phone).toBe('+84901234567');
  });

  function mockTokenIssue() {
    authSessionRepositoryMock.create.mockResolvedValueOnce({ id: 'session-1' });
    authSessionRepositoryMock.update.mockResolvedValue({});
    jwtTokenAdapterMock.generateAccessToken.mockResolvedValueOnce('access-token');
    jwtTokenAdapterMock.generateTokenId.mockReturnValueOnce('refresh-token-id').mockReturnValueOnce('token-family-id');
    jwtTokenAdapterMock.calculateRefreshExpiry.mockReturnValueOnce(new Date(Date.now() + 60_000));
    jwtTokenAdapterMock.generateRefreshToken.mockResolvedValueOnce('refresh-token');
    passwordHasherServiceMock.hashOpaqueToken.mockReturnValueOnce('hashed-refresh-token');
  }
});

function createUserRecord(overrides: Partial<ReturnType<typeof baseUserRecord>> = {}) {
  return {
    ...baseUserRecord(),
    ...overrides,
  };
}

function baseUserRecord() {
  return {
    id: 'user-1',
    email: 'user@example.com',
    phone: null,
    displayName: 'Firebase User',
    password: 'stored-password-hash',
    role: 'user',
    accountStatus: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
