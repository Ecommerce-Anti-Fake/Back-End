import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationRepository } from '../../infrastructure/persistence';
import {
  FirebaseTokenVerifierService,
  PasswordHasherService,
} from '../services';
import {
  ConfirmGoogleLinkUseCase,
  SetLocalCredentialsUseCase,
} from './auth-linking.use-cases';

describe('auth provider linking', () => {
  const now = new Date('2026-07-22T10:00:00.000Z');
  const registrationRepositoryMock = {
    findGoogleLinkIntentById: jest.fn(),
    completeGoogleLink: jest.fn(),
    createRegistrationSession: jest.fn(),
    findAuthIdentity: jest.fn(),
    findUserByIdentifier: jest.fn(),
    setLocalCredentials: jest.fn(),
  };
  const passwordHasherServiceMock = {
    verifyHashedValue: jest.fn(),
    hashOpaqueToken: jest.fn(),
    hashPassword: jest.fn(),
  };
  const firebaseTokenVerifierServiceMock = { verifyIdToken: jest.fn() };
  let confirmGoogleLink: ConfirmGoogleLinkUseCase;
  let setLocalCredentials: SetLocalCredentialsUseCase;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(now.getTime());
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfirmGoogleLinkUseCase,
        SetLocalCredentialsUseCase,
        {
          provide: RegistrationRepository,
          useValue: registrationRepositoryMock,
        },
        { provide: PasswordHasherService, useValue: passwordHasherServiceMock },
        {
          provide: FirebaseTokenVerifierService,
          useValue: firebaseTokenVerifierServiceMock,
        },
      ],
    }).compile();
    confirmGoogleLink = module.get(ConfirmGoogleLinkUseCase);
    setLocalCredentials = module.get(SetLocalCredentialsUseCase);
  });

  afterEach(() => jest.useRealTimers());

  it('links Google to the same local user after local login proves ownership', async () => {
    registrationRepositoryMock.findGoogleLinkIntentById.mockResolvedValueOnce({
      id: 'intent-1',
      userId: 'user-1',
      provider: 'GOOGLE',
      providerSubject: 'firebase-1',
      tokenHash: 'hashed-link-secret',
      expiresAt: new Date(now.getTime() + 600_000),
      usedAt: null,
      user: { id: 'user-1', accountStatus: 'active', emailVerifiedAt: now },
    });
    passwordHasherServiceMock.verifyHashedValue.mockReturnValueOnce(true);
    registrationRepositoryMock.completeGoogleLink.mockResolvedValueOnce({
      id: 'identity-1',
    });

    await expect(
      confirmGoogleLink.execute('user-1', 'intent-1.link-secret'),
    ).resolves.toEqual({
      success: true,
      message: 'Lien ket Google thanh cong.',
    });
    expect(registrationRepositoryMock.completeGoogleLink).toHaveBeenCalledWith(
      'intent-1',
    );
  });

  it('requires email-link verification before linking Google to a phone-verified local user', async () => {
    registrationRepositoryMock.findGoogleLinkIntentById.mockResolvedValueOnce({
      id: 'intent-1',
      userId: 'user-1',
      provider: 'GOOGLE',
      providerSubject: 'firebase-1',
      tokenHash: 'hashed-link-secret',
      expiresAt: new Date(now.getTime() + 600_000),
      usedAt: null,
      user: {
        id: 'user-1',
        email: 'user@example.com',
        accountStatus: 'active',
        emailVerifiedAt: null,
      },
    });
    passwordHasherServiceMock.verifyHashedValue.mockReturnValueOnce(true);
    passwordHasherServiceMock.hashOpaqueToken.mockReturnValueOnce(
      'hashed-registration-secret',
    );
    registrationRepositoryMock.createRegistrationSession.mockImplementationOnce(
      async (input) => ({
        id: 'registration-1',
        expiresAt: input.expiresAt,
      }),
    );

    const result = await confirmGoogleLink.execute(
      'user-1',
      'intent-1.link-secret',
    );
    expect(result).toMatchObject({
      success: false,
      verificationRequired: true,
      registrationToken: expect.stringMatching(/^registration-1\./),
    });
  });

  it('adds local credentials to the same Google user and requires OTP for the new phone', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-1',
      email: 'user@example.com',
      emailVerified: true,
      signInProvider: 'google.com',
      authTime: Math.floor(now.getTime() / 1000),
    });
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce({
      userId: 'user-1',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        accountStatus: 'active',
      },
    });
    registrationRepositoryMock.findUserByIdentifier.mockResolvedValueOnce(null);
    passwordHasherServiceMock.hashPassword.mockResolvedValueOnce(
      'hashed-password',
    );
    passwordHasherServiceMock.hashOpaqueToken.mockReturnValueOnce(
      'hashed-registration-secret',
    );
    registrationRepositoryMock.setLocalCredentials.mockImplementationOnce(
      async (input) => ({
        user: { id: 'user-1', phone: input.phone, phoneVerifiedAt: null },
        session: { id: 'registration-1', expiresAt: input.sessionExpiresAt },
      }),
    );

    const result = await setLocalCredentials.execute('user-1', {
      idToken: 'fresh-google-token',
      phone: '+84901234567',
      password: 'StrongPass123',
    });

    expect(registrationRepositoryMock.setLocalCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        phone: '0901234567',
        password: 'hashed-password',
      }),
    );
    expect(result.registrationToken).toMatch(/^registration-1\./);
  });

  it('rejects a stale or mismatched Google proof when adding a password', async () => {
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'other-firebase-user',
      email: 'user@example.com',
      emailVerified: true,
      signInProvider: 'google.com',
      authTime: Math.floor((now.getTime() - 600_000) / 1000),
    });
    registrationRepositoryMock.findAuthIdentity.mockResolvedValueOnce(null);

    await expect(
      setLocalCredentials.execute('user-1', {
        idToken: 'stale-google-token',
        phone: '0901234567',
        password: 'StrongPass123',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
