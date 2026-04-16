import {
  AdminOpenDisputeRecord,
  DisputeEvidenceRecord,
  DisputeWithOrder,
  OrderAuditLogRecord,
} from '../../infrastructure/persistence/orders.repository';
import { toDisputeEvidenceResponse } from './dispute-evidence.mapper';
import { toOrderResponse } from './orders.mapper';

export function toAdminOpenDisputeResponse(dispute: AdminOpenDisputeRecord) {
  return {
    id: dispute.id,
    orderId: dispute.orderId,
    disputeStatus: dispute.disputeStatus,
    reason: dispute.reason,
    openedByUserId: dispute.openedByUserId,
    sellerShopId: dispute.order.shopId,
    sellerShopName: dispute.order.shop.shopName,
    buyerUserId: dispute.order.buyerUserId,
    buyerShopId: dispute.order.buyerShopId,
    orderStatus: dispute.order.orderStatus,
    openedAt: dispute.openedAt,
  };
}

export function toAdminDisputeDetailResponse(
  dispute: DisputeWithOrder,
  evidence: DisputeEvidenceRecord[],
  moderationCase: {
    id: string;
    caseStatus: string;
    internalNote: string | null;
    assignedAdminUserId: string | null;
    createdAt: Date;
    resolvedAt: Date | null;
  } | null,
  timeline: OrderAuditLogRecord[],
) {
  return {
    dispute: {
      id: dispute.id,
      orderId: dispute.orderId,
      disputeStatus: dispute.disputeStatus,
      reason: dispute.reason,
      openedByUserId: dispute.openedByUserId,
      sellerShopId: dispute.order.shopId,
      sellerShopName: dispute.order.shop.shopName,
      buyerUserId: dispute.order.buyerUserId,
      buyerShopId: dispute.order.buyerShopId,
      orderStatus: dispute.order.orderStatus,
      openedAt: dispute.openedAt,
    },
    moderationCase: moderationCase
      ? {
          id: moderationCase.id,
          caseStatus: moderationCase.caseStatus,
          internalNote: moderationCase.internalNote,
          assignedAdminUserId: moderationCase.assignedAdminUserId,
          createdAt: moderationCase.createdAt,
          resolvedAt: moderationCase.resolvedAt,
        }
      : null,
    order: toOrderResponse(dispute.order),
    evidence: evidence.map(toDisputeEvidenceResponse),
    timeline: timeline.map((log) => ({
      id: log.id,
      action: log.action,
      fromStatus: log.fromStatus ?? null,
      toStatus: log.toStatus ?? null,
      note: log.note ?? null,
      actorUserId: log.actorUserId,
      actorDisplayName: log.actor.displayName ?? null,
      actorEmail: log.actor.email ?? null,
      createdAt: log.createdAt,
    })),
  };
}
