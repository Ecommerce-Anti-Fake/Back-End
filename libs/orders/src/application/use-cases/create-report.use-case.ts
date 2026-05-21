import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { RecalculateRiskTargetsUseCase } from './recalculate-risk-targets.use-case';
import { toReportResponse } from './reports.mapper';

const REPORT_TARGET_TYPES = ['ORDER', 'OFFER', 'SHOP'] as const;

@Injectable()
export class CreateReportUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly recalculateRiskTargetsUseCase: RecalculateRiskTargetsUseCase,
  ) {}

  async execute(input: {
    requesterUserId: string;
    targetType: 'ORDER' | 'OFFER' | 'SHOP';
    targetId: string;
    reason: string;
    description?: string | null;
  }) {
    if (!REPORT_TARGET_TYPES.includes(input.targetType)) {
      throw new BadRequestException('Invalid report target type');
    }

    const reason = input.reason.trim();
    const description = input.description?.trim();
    if (!reason) {
      throw new BadRequestException('Report reason is required');
    }

    const targetLabel = await this.assertTargetVisibleToReporter(input);
    const existing = await this.ordersRepository.findOpenReportByTarget({
      reporterUserId: input.requesterUserId,
      targetType: input.targetType,
      targetId: input.targetId,
    });
    if (existing) {
      throw new BadRequestException('An open report already exists for this target');
    }

    const storedReason = description ? `${reason}\n\n${description}` : reason;
    const report = await this.ordersRepository.createReport({
      reporterUserId: input.requesterUserId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: storedReason,
    });

    await this.ordersRepository.upsertReportModerationCase({
      reportId: report.id,
      caseStatus: 'IN_REVIEW',
      reason: storedReason,
    });

    await this.ordersRepository.createAuditLog({
      targetType: 'REPORT',
      targetId: report.id,
      actorUserId: input.requesterUserId,
      action: 'REPORT_CREATED',
      toStatus: 'OPEN',
      note: storedReason,
      metadata: {
        targetType: input.targetType,
        targetId: input.targetId,
      },
    });

    await this.recalculateRiskTargetsUseCase.executeForReport({
      targetType: input.targetType,
      targetId: input.targetId,
      actorUserId: input.requesterUserId,
    });

    return toReportResponse(report, targetLabel);
  }

  private async assertTargetVisibleToReporter(input: {
    requesterUserId: string;
    targetType: 'ORDER' | 'OFFER' | 'SHOP';
    targetId: string;
  }) {
    if (input.targetType === 'ORDER') {
      const order = await this.ordersRepository.findOrderById(input.targetId);
      if (!order) {
        throw new NotFoundException('Report target not found');
      }
      const isRetailBuyer = order.buyerUserId === input.requesterUserId;
      const isWholesaleBuyerOwner = order.buyerShop?.ownerUserId === input.requesterUserId;
      if (!isRetailBuyer && !isWholesaleBuyerOwner) {
        throw new ForbiddenException('Only the buyer can report this order');
      }
      return order.items[0]?.offerTitleSnapshot ?? order.shop.shopName ?? null;
    }

    if (input.targetType === 'OFFER') {
      const offer = await this.ordersRepository.findOfferReportTarget(input.targetId);
      if (!offer) {
        throw new NotFoundException('Report target not found');
      }
      return offer.title;
    }

    const shop = await this.ordersRepository.findShopReportTarget(input.targetId);
    if (!shop) {
      throw new NotFoundException('Report target not found');
    }
    return shop.shopName;
  }
}
