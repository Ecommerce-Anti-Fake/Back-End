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
      ownerShop: {
        ownerUserId: 'owner-1',
      },
    });
    repositoryMock.findAffiliateAccountByProgramAndUser.mockResolvedValueOnce(null);
    repositoryMock.findAffiliateCodeByCode.mockResolvedValueOnce({
      id: 'code-1',
      programId: 'program-1',
      accountId: 'parent-account-1',
      expiresAt: null,
      account: {
        id: 'parent-account-1',
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
      ownerShop: {
        ownerUserId: 'owner-1',
      },
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

  it('should reject when program owner joins their own program', async () => {
    repositoryMock.findProgramForJoin.mockResolvedValueOnce({
      id: 'program-1',
      programStatus: 'ACTIVE',
      ownerShop: {
        ownerUserId: 'owner-1',
      },
    });

    await expect(
      useCase.execute({
        requesterUserId: 'owner-1',
        programId: 'program-1',
      }),
    ).rejects.toThrow('Program owner cannot join their own affiliate program');
    expect(repositoryMock.findAffiliateAccountByProgramAndUser).not.toHaveBeenCalled();
  });

  it('should reject a circular referral path', async () => {
    repositoryMock.findProgramForJoin.mockResolvedValueOnce({
      id: 'program-1',
      programStatus: 'ACTIVE',
      ownerShop: {
        ownerUserId: 'owner-1',
      },
    });
    repositoryMock.findAffiliateAccountByProgramAndUser.mockResolvedValueOnce(null);
    repositoryMock.findAffiliateCodeByCode.mockResolvedValueOnce({
      id: 'code-1',
      programId: 'program-1',
      accountId: 'parent-account-1',
      expiresAt: null,
      account: {
        id: 'parent-account-1',
        accountStatus: 'ACTIVE',
        referralPath: 'grand-parent-1/parent-account-1',
      },
    });

    await expect(
      useCase.execute({
        requesterUserId: 'user-2',
        programId: 'program-1',
        referralCode: 'spring-aff-001',
      }),
    ).rejects.toThrow('Referral path is circular');
    expect(repositoryMock.createAffiliateAccount).not.toHaveBeenCalled();
  });
});
