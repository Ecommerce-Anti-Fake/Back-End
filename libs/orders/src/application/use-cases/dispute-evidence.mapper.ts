import { DisputeEvidenceRecord } from '../../infrastructure/persistence/orders.repository';

export function toDisputeEvidenceResponse(evidence: DisputeEvidenceRecord) {
  return {
    id: evidence.id,
    disputeId: evidence.disputeId,
    mediaAssetId: evidence.mediaAssetId ?? null,
    uploadedByUserId: evidence.uploadedByUserId,
    mimeType: evidence.mediaAsset?.mimeType ?? evidence.fileType,
    assetType: evidence.mediaAsset?.assetType ?? inferAssetType(evidence.fileType),
    publicId: evidence.mediaAsset?.publicId ?? null,
    fileUrl: evidence.mediaAsset?.secureUrl ?? evidence.fileUrl,
    uploadedAt: evidence.uploadedAt,
  };
}

function inferAssetType(fileType: string | null) {
  if (!fileType) {
    return null;
  }

  if (fileType.startsWith('video/')) {
    return 'VIDEO' as const;
  }

  if (fileType.startsWith('image/')) {
    return 'IMAGE' as const;
  }

  return 'RAW' as const;
}
