import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateAdminModerationCaseMessage } from '@contracts';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toModerationCaseResponse } from './moderation-case.mapper';

@Injectable()
export class UpdateAdminModerationCaseUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: UpdateAdminModerationCaseMessage) {
    const existingCase = await this.ordersRepository.findModerationCaseById(input.caseId);
    if (!existingCase) {
      throw new NotFoundException('Moderation case not found');
    }

    const resolvedAt = ['RESOLVED', 'CLOSED'].includes(input.caseStatus) ? new Date() : null;
    const updatedCase = await this.ordersRepository.updateModerationCase({
      id: input.caseId,
      caseStatus: input.caseStatus,
      internalNote: input.internalNote ?? existingCase.internalNote,
      assignedAdminUserId: input.assignedAdminUserId ?? existingCase.assignedAdminUserId,
      resolvedAt,
    });

    await this.ordersRepository.createAuditLog({
      targetType: existingCase.targetType,
      targetId: existingCase.targetId,
      actorUserId: input.requesterUserId,
      action: 'MODERATION_CASE_UPDATED',
      fromStatus: existingCase.caseStatus,
      toStatus: input.caseStatus,
      note: input.internalNote ?? null,
      metadata: {
        caseId: input.caseId,
        assignedAdminUserId: input.assignedAdminUserId ?? existingCase.assignedAdminUserId,
      },
    });

    return toModerationCaseResponse(updatedCase);
  }
}
