import { Injectable, NotFoundException } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';

@Injectable()
export class ListAffiliateProgramMembersUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: { requesterUserId: string; programId: string; page: number; pageSize: number }) {
    const program = await this.repository.findOwnedProgramById(
      input.programId,
      input.requesterUserId,
    );
    if (!program) {
      throw new NotFoundException('Affiliate program not found');
    }

    const skip = (input.page - 1) * input.pageSize;
    const [members, total] = await Promise.all([
      this.repository.findProgramMembers(input.programId, skip, input.pageSize),
      this.repository.countProgramMembers(input.programId),
    ]);
    return {
      items: members.map((member) => ({
        accountId: member.id,
        displayName: member.user.displayName ?? 'Affiliate member',
        parentAccountId: member.parentAccountId,
        parentDisplayName: member.parentAccount?.user.displayName ?? null,
        networkDepth: (member.referralPath?.split('/').filter(Boolean).length ?? 0) + 1,
        accountStatus: member.accountStatus,
        joinedAt: member.joinedAt,
      })),
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }
}
