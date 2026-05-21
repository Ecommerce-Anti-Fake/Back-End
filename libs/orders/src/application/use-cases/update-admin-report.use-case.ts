import { Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { RecalculateRiskTargetsUseCase } from './recalculate-risk-targets.use-case';
import { toReportResponse } from './reports.mapper';

@Injectable()
export class UpdateAdminReportUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly recalculateRiskTargetsUseCase: RecalculateRiskTargetsUseCase,
  ) {}

  async execute(input: {
    reportId: string;
    requesterUserId: string;
    reportStatus: 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
    internalNote?: string | null;
  }) {
    const report = await this.ordersRepository.findReportById(input.reportId);
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const updated = await this.ordersRepository.updateReportStatus({
      id: report.id,
      reportStatus: input.reportStatus,
    });

    await this.ordersRepository.upsertReportModerationCase({
      reportId: report.id,
      caseStatus: input.reportStatus === 'IN_REVIEW' ? 'IN_REVIEW' : 'RESOLVED',
      internalNote: input.internalNote ?? null,
      reason: report.reason,
      assignedAdminUserId: input.requesterUserId,
      resolvedAt: input.reportStatus === 'IN_REVIEW' ? null : new Date(),
    });

    await this.ordersRepository.createAuditLog({
      targetType: 'REPORT',
      targetId: report.id,
      actorUserId: input.requesterUserId,
      action: 'REPORT_STATUS_CHANGED',
      fromStatus: report.reportStatus,
      toStatus: input.reportStatus,
      note: input.internalNote ?? null,
      metadata: {
        targetType: report.targetType,
        targetId: report.targetId,
      },
    });

    await this.recalculateRiskTargetsUseCase.executeForReport({
      targetType: report.targetType,
      targetId: report.targetId,
      actorUserId: input.requesterUserId,
    });

    return toReportResponse(updated);
  }
}
