import { ReportWithReporter } from '../../infrastructure/persistence/orders.repository';

export function toReportResponse(report: ReportWithReporter, targetLabel: string | null = null) {
  return {
    id: report.id,
    reporterUserId: report.reporterUserId,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    reportStatus: report.reportStatus,
    createdAt: report.createdAt,
    reporterDisplayName: report.reporter.displayName ?? null,
    reporterEmail: report.reporter.email ?? null,
    targetLabel,
  };
}
