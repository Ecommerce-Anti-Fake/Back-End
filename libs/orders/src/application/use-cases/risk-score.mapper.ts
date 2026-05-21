import { RiskScoreRecord } from '../../infrastructure/persistence/orders.repository';

export type RiskScoreFactor = {
  key: string;
  value: number | string | boolean | null;
  impact: number;
  label: string;
};

export function toRiskScoreResponse(score: RiskScoreRecord, targetLabel: string | null = null) {
  return {
    id: score.id,
    targetType: score.targetType,
    targetId: score.targetId,
    targetLabel,
    score: Number(score.score),
    riskLevel: score.riskLevel,
    factors: parseFactors(score.factorSummary),
    calculatedAt: score.calculatedAt,
  };
}

export function parseFactors(summary: string): RiskScoreFactor[] {
  try {
    const parsed = JSON.parse(summary) as { factors?: RiskScoreFactor[] };
    return Array.isArray(parsed.factors) ? parsed.factors : [];
  } catch {
    return [];
  }
}
