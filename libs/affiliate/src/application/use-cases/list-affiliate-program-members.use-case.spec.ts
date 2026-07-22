import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { ListAffiliateProgramMembersUseCase } from './list-affiliate-program-members.use-case';

describe('ListAffiliateProgramMembersUseCase', () => {
  const repository = {
    findOwnedProgramById: jest.fn(),
    findProgramMembers: jest.fn(),
    countProgramMembers: jest.fn(),
  };
  let useCase: ListAffiliateProgramMembersUseCase;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ListAffiliateProgramMembersUseCase,
        { provide: AffiliateRepository, useValue: repository },
      ],
    }).compile();
    useCase = module.get(ListAffiliateProgramMembersUseCase);
  });

  it('exposes parent and depth so the owner can identify the affiliate tier', async () => {
    repository.findOwnedProgramById.mockResolvedValue({ id: 'program-1' });
    repository.countProgramMembers.mockResolvedValue(1);
    repository.findProgramMembers.mockResolvedValue([
      {
        id: 'child',
        user: { displayName: 'Child' },
        parentAccountId: 'parent',
        parentAccount: { user: { displayName: 'Parent' } },
        referralPath: 'root/parent',
        accountStatus: 'ACTIVE',
        joinedAt: new Date('2026-07-22T00:00:00.000Z'),
      },
    ]);

    await expect(useCase.execute({ requesterUserId: 'owner', programId: 'program-1', page: 1, pageSize: 20 }))
      .resolves.toEqual(expect.objectContaining({
        items: [expect.objectContaining({
          accountId: 'child',
          displayName: 'Child',
          parentAccountId: 'parent',
          parentDisplayName: 'Parent',
          networkDepth: 3,
        })],
        page: 1,
        pageSize: 20,
        total: 1,
      }));
    expect(repository.findProgramMembers).toHaveBeenCalledWith('program-1', 0, 20);
  });

  it('does not expose another shop program', async () => {
    repository.findOwnedProgramById.mockResolvedValue(null);
    await expect(useCase.execute({ requesterUserId: 'other', programId: 'program-1', page: 1, pageSize: 20 }))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
