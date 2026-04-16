import {
  AuditLogRecord,
  PendingUserKycRecord,
  UserKycWithDocuments,
  UserKycWithHistory,
} from '../../infrastructure/persistence/users.repository';

function toKycDocumentResponse(document: {
  side: 'FRONT' | 'BACK';
  mediaAssetId: string;
  mediaAsset: {
    assetType: 'IMAGE' | 'VIDEO' | 'RAW';
    mimeType: string | null;
    publicId: string | null;
    secureUrl: string;
  };
}) {
  return {
    side: document.side,
    mediaAssetId: document.mediaAssetId,
    assetType: document.mediaAsset.assetType,
    mimeType: document.mediaAsset.mimeType ?? null,
    publicId: document.mediaAsset.publicId ?? null,
    fileUrl: document.mediaAsset.secureUrl,
  };
}

export function toAuditLogResponse(log: AuditLogRecord) {
  return {
    id: log.id,
    action: log.action,
    fromStatus: log.fromStatus ?? null,
    toStatus: log.toStatus ?? null,
    note: log.note ?? null,
    actorUserId: log.actorUserId,
    actorDisplayName: log.actor.displayName ?? null,
    actorEmail: log.actor.email ?? null,
    createdAt: log.createdAt,
  };
}

export function toUserKycResponse(kyc: UserKycWithDocuments) {
  return {
    id: kyc.id,
    userId: kyc.userId,
    fullName: kyc.fullName,
    dateOfBirth: kyc.dateOfBirth,
    idType: kyc.idType,
    kycLevel: kyc.kycLevel,
    verificationStatus: kyc.verificationStatus,
    reviewNote: kyc.reviewNote ?? null,
    verifiedAt: kyc.verifiedAt ?? null,
    documents: kyc.documents.map(toKycDocumentResponse),
  };
}

export function toAdminPendingKycItemResponse(kyc: PendingUserKycRecord) {
  return {
    id: kyc.id,
    userId: kyc.userId,
    fullName: kyc.fullName,
    email: kyc.user.email,
    phone: kyc.user.phone,
    verificationStatus: kyc.verificationStatus,
    idType: kyc.idType,
    submittedAt: kyc.documents[0]?.uploadedAt ?? null,
    documents: kyc.documents.map(toKycDocumentResponse),
  };
}

export function toAdminKycDetailResponse(kyc: UserKycWithHistory, timeline: AuditLogRecord[]) {
  return {
    id: kyc.id,
    userId: kyc.userId,
    fullName: kyc.fullName,
    email: kyc.user.email,
    phone: kyc.user.phone,
    verificationStatus: kyc.verificationStatus,
    reviewNote: kyc.reviewNote ?? null,
    verifiedAt: kyc.verifiedAt ?? null,
    currentDocuments: kyc.documents.map(toKycDocumentResponse),
    submissions: kyc.submissions.map((submission) => ({
      id: submission.id,
      submissionNumber: submission.submissionNumber,
      verificationStatus: submission.verificationStatus,
      reviewNote: submission.reviewNote ?? null,
      reviewedAt: submission.reviewedAt ?? null,
      submittedAt: submission.submittedAt,
      documents: submission.documents.map(toKycDocumentResponse),
    })),
    timeline: timeline.map(toAuditLogResponse),
  };
}
