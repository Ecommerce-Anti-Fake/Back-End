import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationRepository } from '../../infrastructure/persistence';
import {
  FirebaseTokenVerifierService,
  PasswordHasherService,
} from '../services';
import {
  ConfirmRegistrationChallengeUseCase,
  CreateRegistrationChallengeUseCase,
  ResendRegistrationChallengeUseCase,
} from './registration-verification.use-cases';

describe('registration verification challenges', () => {
  const now = new Date('2026-07-22T10:00:00.000Z');
  const registrationRepositoryMock = {
    findRegistrationSessionById: jest.fn(),
    findPendingChallenge: jest.fn(),
    createChallenge: jest.fn(),
    findChallengeById: jest.fn(),
    supersedeChallengeAndCreate: jest.fn(),
    completeVerification: jest.fn(),
    countRecentChallengesForUser: jest.fn(),
  };
  const passwordHasherServiceMock = {
    verifyHashedValue: jest.fn(),
    hashOpaqueToken: jest.fn(),
  };
  const firebaseTokenVerifierServiceMock = {
    verifyIdToken: jest.fn(),
  };

  let createUseCase: CreateRegistrationChallengeUseCase;
  let resendUseCase: ResendRegistrationChallengeUseCase;
  let confirmUseCase: ConfirmRegistrationChallengeUseCase;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(now.getTime());
    jest.resetAllMocks();
    passwordHasherServiceMock.verifyHashedValue.mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRegistrationChallengeUseCase,
        ResendRegistrationChallengeUseCase,
        ConfirmRegistrationChallengeUseCase,
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

    createUseCase = module.get(CreateRegistrationChallengeUseCase);
    resendUseCase = module.get(ResendRegistrationChallengeUseCase);
    confirmUseCase = module.get(ConfirmRegistrationChallengeUseCase);
  });

  afterEach(() => jest.useRealTimers());

  it('creates a phone challenge that expires server-side after exactly 180 seconds', async () => {
    registrationRepositoryMock.findRegistrationSessionById.mockResolvedValueOnce(
      activeSession(),
    );
    registrationRepositoryMock.findPendingChallenge.mockResolvedValueOnce(null);
    registrationRepositoryMock.createChallenge.mockImplementationOnce(
      async (input) => ({
        id: 'challenge-1',
        channel: input.channel,
        expiresAt: input.expiresAt,
        createdAt: now,
      }),
    );

    const result = await createUseCase.execute(
      'session-1.registration-secret',
      { channel: 'PHONE' },
    );

    expect(result.challenge.expiresAt).toEqual(
      new Date(now.getTime() + 180_000),
    );
    expect(result.challenge.resendAt).toEqual(
      new Date(now.getTime() + 180_000),
    );
    expect(result.challenge).not.toHaveProperty('state');
  });

  it('limits verification sends to five per user in one hour', async () => {
    registrationRepositoryMock.findRegistrationSessionById.mockResolvedValueOnce(
      activeSession(),
    );
    registrationRepositoryMock.findPendingChallenge.mockResolvedValueOnce(null);
    registrationRepositoryMock.countRecentChallengesForUser.mockResolvedValueOnce(
      5,
    );

    await expect(
      createUseCase.execute('session-1.registration-secret', {
        channel: 'EMAIL',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        error: 'VERIFICATION_SEND_LIMIT_REACHED',
      }),
    });
    expect(registrationRepositoryMock.createChallenge).not.toHaveBeenCalled();
  });

  it('rejects phone resend before second 180 and supersedes it at second 180', async () => {
    registrationRepositoryMock.findRegistrationSessionById.mockResolvedValue(
      activeSession(),
    );
    registrationRepositoryMock.findChallengeById.mockResolvedValue({
      id: 'challenge-1',
      sessionId: 'session-1',
      channel: 'PHONE',
      status: 'PENDING',
      expiresAt: new Date(now.getTime() + 180_000),
    });

    await expect(
      resendUseCase.execute('session-1.registration-secret', 'challenge-1'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ error: 'RESEND_NOT_AVAILABLE' }),
    });

    jest.setSystemTime(now.getTime() + 180_000);
    registrationRepositoryMock.supersedeChallengeAndCreate.mockImplementationOnce(
      async (_id, input) => ({
        id: 'challenge-2',
        channel: input.channel,
        expiresAt: input.expiresAt,
        createdAt: new Date(),
      }),
    );

    const result = await resendUseCase.execute(
      'session-1.registration-secret',
      'challenge-1',
    );
    expect(result.challenge.id).toBe('challenge-2');
    expect(
      registrationRepositoryMock.supersedeChallengeAndCreate,
    ).toHaveBeenCalled();
  });

  it('activates the account only for a fresh matching phone proof', async () => {
    const challenge = {
      id: 'challenge-1',
      sessionId: 'session-1',
      channel: 'PHONE',
      status: 'PENDING',
      createdAt: now,
      expiresAt: new Date(now.getTime() + 180_000),
      session: activeSession(),
    };
    registrationRepositoryMock.findChallengeById.mockResolvedValueOnce(
      challenge,
    );
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'firebase-phone-1',
      phoneNumber: '+84901234567',
      signInProvider: 'phone',
      authTime: Math.floor(now.getTime() / 1000),
    });
    registrationRepositoryMock.completeVerification.mockResolvedValueOnce({
      accountStatus: 'active',
    });

    await expect(
      confirmUseCase.execute({
        registrationToken: 'session-1.registration-secret',
        challengeId: 'challenge-1',
        idToken: 'firebase-token',
      }),
    ).resolves.toEqual({
      success: true,
      message: 'Xac minh tai khoan thanh cong.',
    });
    expect(
      registrationRepositoryMock.completeVerification,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'PHONE', userId: 'user-1' }),
    );
  });

  it('rejects a Google token as email-link proof', async () => {
    registrationRepositoryMock.findChallengeById.mockResolvedValueOnce({
      id: 'challenge-1',
      sessionId: 'session-1',
      channel: 'EMAIL',
      status: 'PENDING',
      stateTokenHash: 'hashed-state',
      createdAt: now,
      expiresAt: new Date(now.getTime() + 900_000),
      session: activeSession(),
    });
    passwordHasherServiceMock.verifyHashedValue.mockReturnValue(true);
    firebaseTokenVerifierServiceMock.verifyIdToken.mockResolvedValueOnce({
      uid: 'google-1',
      email: 'user@example.com',
      emailVerified: true,
      signInProvider: 'google.com',
      authTime: Math.floor(now.getTime() / 1000),
    });

    await expect(
      confirmUseCase.execute({
        challengeId: 'challenge-1',
        state: 'challenge-1.state-secret',
        idToken: 'google-token',
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(
      registrationRepositoryMock.completeVerification,
    ).not.toHaveBeenCalled();
  });

  function activeSession() {
    return {
      id: 'session-1',
      userId: 'user-1',
      provider: 'LOCAL',
      purpose: 'REGISTER',
      tokenHash: 'hashed-registration-secret',
      expiresAt: new Date(now.getTime() + 86_400_000),
      completedAt: null,
      revokedAt: null,
      user: {
        id: 'user-1',
        email: 'user@example.com',
        phone: '0901234567',
        accountStatus: 'pending_verification',
      },
    };
  }
});
