import { Test, TestingModule } from '@nestjs/testing';
import { JoinAffiliateProgramUseCase } from './join-affiliate-program.use-case';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';

describe('JoinAffiliateProgramUseCase', () => {
  let useCase: JoinAffiliateProgramUseCase;

  const repositoryMock = {
    findProgramForJoin: jest.fn(),
    findAffiliateAccountByProgramAndUser: jest.fn(),
    findAffiliateCodeByCode: jest.fn(),
    createAffiliateAccount: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JoinAffiliateProgramUseCase,
        { provide: AffiliateRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<JoinAffiliateProgramUseCase>(JoinAffiliateProgramUseCase);
  });

  it('should join an active program with referral code and inherit referral path', async () => {
    repositoryMock.findProgramForJoin.mockResolvedValueOnce({
      id: 'program-1',
      programStatus: 'ACTIVE',
    });
    repositoryMock.findAffiliateAccountByProgramAndUser.mockResolvedValueOnce(null);
    repositoryMock.findAffiliateCodeByCode.mockResolvedValueOnce({
      id: 'code-1',
      programId: 'program-1',
      accountId: 'parent-account-1',
      expiresAt: null,
      account: {
        accountStatus: 'ACTIVE',
        referralPath: 'grand-parent-1',
      },
    });
    repositoryMock.createAffiliateAccount.mockResolvedValueOnce({
      id: 'account-1',
      programId: 'program-1',
      userId: 'user-2',
      parentAccountId: 'parent-account-1',
      accountStatus: 'ACTIVE',
      referralPath: 'grand-parent-1/parent-account-1',
      joinedAt: new Date('2026-04-14T10:00:00.000Z'),
      approvedAt: new Date('2026-04-14T10:00:00.000Z'),
      program: {
        name: 'Spring Program',
      },
    });

    const result = await useCase.execute({
      requesterUserId: 'user-2',
      programId: 'program-1',
      referralCode: 'spring-aff-001',
    });

    expect(repositoryMock.createAffiliateAccount).toHaveBeenCalledWith({
      programId: 'program-1',
      userId: 'user-2',
      parentAccountId: 'parent-account-1',
      referralPath: 'grand-parent-1/parent-account-1',
    });
    expect(result).toMatchObject({
      id: 'account-1',
      programId: 'program-1',
      parentAccountId: 'parent-account-1',
      referralPath: 'grand-parent-1/parent-account-1',
    });
  });

  it('should reject when user already joined the program', async () => {
    repositoryMock.findProgramForJoin.mockResolvedValueOnce({
      id: 'program-1',
      programStatus: 'ACTIVE',
    });
    repositoryMock.findAffiliateAccountByProgramAndUser.mockResolvedValueOnce({
      id: 'account-existing',
    });

    await expect(
      useCase.execute({
        requesterUserId: 'user-2',
        programId: 'program-1',
      }),
    ).rejects.toThrow('User has already joined this affiliate program');
  });
});
