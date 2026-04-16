import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toUserKycResponse } from './users-kyc.mapper';

@Injectable()
export class ReviewUserKycUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(input: {
    userId: string;
    reviewerUserId?: string;
    verificationStatus: 'approved' | 'rejected';
    reviewNote?: string | null;
  }) {
    const kyc = await this.usersRepository.findUserKycByUserId(input.userId);
    if (!kyc) {
      throw new NotFoundException('User KYC not found');
    }

    if (kyc.documents.length < 2) {
      throw new BadRequestException('KYC must include front and back ID documents before review');
    }

    const updated = await this.usersRepository.reviewUserKyc({
      userId: input.userId,
      verificationStatus: input.verificationStatus,
      reviewNote: input.reviewNote?.trim() || null,
    });

    await this.usersRepository.createAuditLog({
      targetType: 'USER_KYC',
      targetId: updated.id,
      actorUserId: input.reviewerUserId ?? input.userId,
      action: 'KYC_REVIEWED',
      fromStatus: kyc.verificationStatus,
      toStatus: input.verificationStatus,
      note: input.reviewNote?.trim() || null,
    });

    return toUserKycResponse(updated);
  }
}
