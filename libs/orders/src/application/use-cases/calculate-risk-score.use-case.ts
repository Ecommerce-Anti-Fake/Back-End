import { Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository, RiskSignalSnapshot, RiskTargetType } from '../../infrastructure/persistence/orders.repository';
import { RiskScoreFactor, toRiskScoreResponse } from './risk-score.mapper';

@Injectable()
export class CalculateRiskScoreUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: { targetType: RiskTargetType; targetId: string; actorUserId?: string | null }) {
    const signals = await this.ordersRepository.getRiskSignals(input.targetType, input.targetId);
    if (!signals) {
      throw new NotFoundException('Risk target not found');
    }

    const factors = this.buildFactors(signals);
    const score = Math.min(100, Math.max(0, factors.reduce((sum, factor) => sum + factor.impact, 0)));
    const riskLevel = this.resolveRiskLevel(score);
    const previous = await this.ordersRepository.findRiskScoreByTarget(input.targetType, input.targetId);
    const factorSummary = JSON.stringify({
      targetLabel: signals.targetLabel,
      inputs: signals,
      factors,
    });
    const saved = await this.ordersRepository.saveRiskScore({
      targetType: input.targetType,
      targetId: input.targetId,
      score,
      riskLevel,
      factorSummary,
      calculatedAt: new Date(),
    });

    if (input.actorUserId && (!previous || Number(previous.score) !== score || previous.riskLevel !== riskLevel)) {
      await this.ordersRepository.createAuditLog({
        targetType: input.targetType,
        targetId: input.targetId,
        actorUserId: input.actorUserId,
        action: 'RISK_SCORE_RECALCULATED',
        fromStatus: previous?.riskLevel ?? null,
        toStatus: riskLevel,
        note: `Risk score ${previous ? Number(previous.score) : '-'} -> ${score}`,
        metadata: {
          score,
          previousScore: previous ? Number(previous.score) : null,
          factors,
        },
      });
    }

    return toRiskScoreResponse(saved, signals.targetLabel);
  }

  private buildFactors(signals: RiskSignalSnapshot): RiskScoreFactor[] {
    const factors: RiskScoreFactor[] = [];

    if (signals.openReportCount > 0) {
      factors.push({
        key: 'openReports',
        value: signals.openReportCount,
        impact: Math.min(40, signals.openReportCount * 20),
        label: `${signals.openReportCount} report dang mo hoac dang xu ly`,
      });
    }
    if (signals.resolvedReportCount > 0) {
      factors.push({
        key: 'resolvedReports',
        value: signals.resolvedReportCount,
        impact: Math.min(15, signals.resolvedReportCount * 5),
        label: `${signals.resolvedReportCount} report da xu ly co lich su`,
      });
    }
    if (signals.openDisputeCount > 0) {
      factors.push({
        key: 'openDisputes',
        value: signals.openDisputeCount,
        impact: Math.min(40, signals.openDisputeCount * 20),
        label: `${signals.openDisputeCount} tranh chap dang mo`,
      });
    }
    if (signals.refundedDisputeCount > 0) {
      factors.push({
        key: 'refundedDisputes',
        value: signals.refundedDisputeCount,
        impact: Math.min(45, signals.refundedDisputeCount * 30),
        label: `${signals.refundedDisputeCount} tranh chap ket thuc bang hoan tien`,
      });
    }
    if (signals.rejectedDocumentCount > 0) {
      factors.push({
        key: 'rejectedDocuments',
        value: signals.rejectedDocumentCount,
        impact: Math.min(35, signals.rejectedDocumentCount * 18),
        label: `${signals.rejectedDocumentCount} ho so bi tu choi`,
      });
    }
    if (signals.pendingDocumentCount > 0) {
      factors.push({
        key: 'pendingDocuments',
        value: signals.pendingDocumentCount,
        impact: Math.min(20, signals.pendingDocumentCount * 6),
        label: `${signals.pendingDocumentCount} ho so dang cho duyet`,
      });
    }
    if (signals.missingProvenance) {
      factors.push({
        key: 'missingProvenance',
        value: true,
        impact: 18,
        label: 'Thieu lien ket provenance/batch da xac minh',
      });
    }
    if (signals.reviewCount >= 3 && signals.averageRating !== null && signals.averageRating < 3) {
      factors.push({
        key: 'lowRating',
        value: Number(signals.averageRating.toFixed(2)),
        impact: 15,
        label: `Diem danh gia trung binh thap (${signals.averageRating.toFixed(2)})`,
      });
    }
    if (signals.rejectedReportCount > 0 && factors.length > 0) {
      factors.push({
        key: 'rejectedReportsOffset',
        value: signals.rejectedReportCount,
        impact: -Math.min(10, signals.rejectedReportCount * 5),
        label: `${signals.rejectedReportCount} report bi tu choi giam diem rui ro`,
      });
    }

    return factors;
  }

  private resolveRiskLevel(score: number) {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }
}
