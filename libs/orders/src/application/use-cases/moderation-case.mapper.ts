import { ModerationCaseRecord } from '../../infrastructure/persistence/orders.repository';

export function toModerationCaseResponse(caseRecord: ModerationCaseRecord) {
  return {
    id: caseRecord.id,
    targetType: caseRecord.targetType,
    targetId: caseRecord.targetId,
    reason: caseRecord.reason,
    caseStatus: caseRecord.caseStatus,
    internalNote: caseRecord.internalNote,
    assignedAdminUserId: caseRecord.assignedAdminUserId,
    assignedAdminDisplayName: caseRecord.assignedAdmin?.displayName ?? null,
    assignedAdminEmail: caseRecord.assignedAdmin?.email ?? null,
    createdAt: caseRecord.createdAt,
    resolvedAt: caseRecord.resolvedAt,
  };
}
