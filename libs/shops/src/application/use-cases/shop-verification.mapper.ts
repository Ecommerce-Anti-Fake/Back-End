type ShopDocumentRecord = {
  id: string;
  requirementId?: string | null;
  docType: string;
  files?: Array<{
    id: string;
    fileUrl: string;
    mediaAssetId: string;
    sortOrder: number;
    uploadedAt: Date;
  }>;
  reviewStatus: string;
  reviewNote: string | null;
  reviewedAt: Date | null;
  uploadedAt: Date;
};

type AuditLogRecord = {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actorUserId: string;
  createdAt: Date;
  actor: {
    displayName: string | null;
    email: string | null;
  };
};

type VerificationSummaryRecord = {
  id: string;
  shopStatus: string;
  registrationType: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
  documents: Array<{
    reviewStatus: string;
    reviewNote: string | null;
    uploadedAt: Date;
  }>;
  registeredCategories: Array<{
    categoryId: string;
    registrationStatus: string;
    reviewNote: string | null;
    approvedAt: Date | null;
    category: {
      id: string;
      name: string;
      riskTier: string;
    };
  }>;
  owner: {
    kyc: {
      verificationStatus: string;
      reviewNote: string | null;
      documents: Array<{
        side: 'FRONT' | 'BACK';
      }>;
    } | null;
  };
};

export function toShopDocumentResponse(document: ShopDocumentRecord) {
  const files = [...(document.files ?? [])].sort((left, right) => left.sortOrder - right.sortOrder);

  return {
    id: document.id,
    requirementId: document.requirementId ?? null,
    docType: document.docType,
    files,
    reviewStatus: document.reviewStatus,
    reviewNote: document.reviewNote,
    reviewedAt: document.reviewedAt,
    uploadedAt: document.uploadedAt,
  };
}

export function toAuditLogResponse(log: AuditLogRecord) {
  return {
    id: log.id,
    action: log.action,
    fromStatus: log.fromStatus,
    toStatus: log.toStatus,
    note: log.note,
    actorUserId: log.actorUserId,
    actorDisplayName: log.actor.displayName ?? null,
    actorEmail: log.actor.email ?? null,
    createdAt: log.createdAt,
  };
}

function groupLatestAndHistory<T extends { uploadedAt: Date }>(items: T[]) {
  const sorted = [...items].sort((left, right) => right.uploadedAt.getTime() - left.uploadedAt.getTime());
  return {
    latestSubmission: sorted[0],
    history: sorted,
  };
}

export function toShopVerificationSummaryResponse(shop: VerificationSummaryRecord) {
  const kycStatus = shop.owner.kyc?.verificationStatus ?? 'missing';
  const hasRequiredKycDocuments =
    shop.owner.kyc?.documents.some((document) => document.side === 'FRONT') === true &&
    shop.owner.kyc?.documents.some((document) => document.side === 'BACK') === true;
  const requiresShopDocuments = true;
  const approvedShopDocuments = shop.documents.filter((document) => document.reviewStatus === 'approved').length;
  const hasApprovedShopDocument = approvedShopDocuments > 0;
  const rejectedKycReviewNote =
    shop.owner.kyc?.verificationStatus === 'rejected' ? shop.owner.kyc.reviewNote : null;
  const rejectedShopDocumentReviewNote =
    [...shop.documents]
      .filter((document) => document.reviewStatus === 'rejected' && document.reviewNote)
      .sort((left, right) => right.uploadedAt.getTime() - left.uploadedAt.getTime())[0]?.reviewNote ?? null;

  const categories = shop.registeredCategories.map((registration) => ({
    categoryId: registration.category.id,
    categoryName: registration.category.name,
    riskTier: registration.category.riskTier,
    requiredVerification: false,
    registrationStatus: registration.registrationStatus,
    reviewNote: registration.reviewNote,
    approvedAt: registration.approvedAt,
  }));

  const missingRequirements: string[] = [];
  if (kycStatus !== 'approved' || !hasRequiredKycDocuments) {
    missingRequirements.push('KYC_APPROVAL_REQUIRED');
  }
  if (requiresShopDocuments && !hasApprovedShopDocument) {
    missingRequirements.push('SHOP_DOCUMENT_APPROVAL_REQUIRED');
  }

  return {
    shopId: shop.id,
    shopStatus: shop.shopStatus,
    registrationType: shop.registrationType,
    reviewNote: rejectedKycReviewNote ?? rejectedShopDocumentReviewNote ?? null,
    canOperate: shop.shopStatus === 'verified',
    kycStatus:
      kycStatus === 'approved' || kycStatus === 'pending' || kycStatus === 'rejected' ? kycStatus : 'missing',
    hasRequiredKycDocuments,
    requiresShopDocuments,
    hasApprovedShopDocument,
    totalShopDocuments: shop.documents.length,
    approvedShopDocuments,
    missingRequirements,
    categories,
  };
}

type PendingVerificationShopRecord = {
  id: string;
  shopName: string;
  businessType: string;
  shopStatus: string;
  createdAt: Date;
  avatarMedia?: {
    secureUrl: string;
  } | null;
  owner: {
    id: string;
    displayName: string | null;
    email: string | null;
  };
};

type AdminVerificationDetailRecord = {
  id: string;
  ownerUserId: string;
  shopName: string;
  registrationType: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
  shopType?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    requirements: Array<{
      requirementId: string;
      required: boolean;
      sortOrder: number;
      requirement: {
        id: string;
        code: string;
        name: string;
        description: string | null;
        multipleFilesAllowed: boolean;
      };
    }>;
  } | null;
  shopStatus: string;
  businessType: string;
  taxCode: string | null;
  warehouseAddress?: string | null;
  warehouseProvinceCode?: string | null;
  warehouseProvinceName?: string | null;
  warehouseWardCode?: string | null;
  warehouseWardName?: string | null;
  createdAt: Date;
  documents: Array<ShopDocumentRecord>;
  owner: {
    id: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
    kyc: {
      id: string;
      userId: string;
      fullName: string;
      dateOfBirth: Date;
      idType: string;
      kycLevel: string;
      verificationStatus: string;
      reviewNote: string | null;
      verifiedAt: Date | null;
      documents: Array<{
        id: string;
        side: 'FRONT' | 'BACK';
        mediaAssetId: string;
        uploadedAt: Date;
        mediaAsset: {
          assetType: 'IMAGE' | 'VIDEO' | 'RAW';
          mimeType: string | null;
          publicId: string | null;
          secureUrl: string;
        };
      }>;
    } | null;
  };
  registeredCategories: Array<
    {
      categoryId: string;
      registrationStatus: string;
      reviewNote: string | null;
      approvedAt: Date | null;
      category: {
        id: string;
        name: string;
        riskTier: string;
      };
    }
  >;
};

export function toPendingVerificationShopResponse(shop: PendingVerificationShopRecord) {
  return {
    id: shop.id,
    shopName: shop.shopName,
    owner: {
      id: shop.owner.id,
      displayName: shop.owner.displayName,
      email: shop.owner.email,
    },
    businessType: shop.businessType,
    avatar: shop.avatarMedia?.secureUrl ?? null,
    createdAt: shop.createdAt,
    shopStatus: shop.shopStatus,
  };
}

export function toAdminShopVerificationDetailResponse(shop: AdminVerificationDetailRecord) {
  const shopDocuments = shop.documents.map(toShopDocumentResponse);
  const kyc = shop.owner.kyc;

  return {
    shop: {
      id: shop.id,
      shopName: shop.shopName,
      registrationType: shop.registrationType,
      businessType: shop.businessType,
      taxCode: shop.taxCode,
      status: shop.shopStatus,
      createdAt: shop.createdAt,
    },
    owner: {
      id: shop.owner.id,
      displayName: shop.owner.displayName,
      email: shop.owner.email,
      phone: shop.owner.phone,
    },
    categories: shop.registeredCategories.map((item) => ({
      id: item.category.id,
      name: item.category.name,
    })),
    kyc: kyc
      ? {
          type: kyc.idType,
          frontImage: kyc.documents.find((document) => document.side === 'FRONT')?.mediaAsset.secureUrl ?? null,
          backImage: kyc.documents.find((document) => document.side === 'BACK')?.mediaAsset.secureUrl ?? null,
          status: kyc.verificationStatus,
        }
      : null,
    documents:
      shop.shopType?.requirements.map((item) => {
        const submissions = shopDocuments.filter(
          (document) =>
            document.requirementId === item.requirement.id || document.docType === item.requirement.code,
        );
        const latest = submissions.length > 0 ? groupLatestAndHistory(submissions).latestSubmission : null;

        return {
          id: item.requirement.id,
          code: item.requirement.code,
          name: item.requirement.name,
          required: item.required,
          status: latest?.reviewStatus ?? 'pending',
          files: latest?.files.map((file) => file.fileUrl) ?? [],
        };
      }) ?? [],
  };
}

export function toAdminShopRegistrationDetailResponse(shop: AdminVerificationDetailRecord) {
  const shopDocuments = shop.documents.map(toShopDocumentResponse);

  return {
    shopId: shop.id,
    basicInfo: {
      id: shop.id,
      ownerUserId: shop.ownerUserId,
      shopName: shop.shopName,
      registrationType: shop.registrationType,
      businessType: shop.businessType,
      taxCode: shop.taxCode,
      shopStatus: shop.shopStatus,
      warehouseAddress: shop.warehouseAddress ?? null,
      warehouseProvinceCode: shop.warehouseProvinceCode ?? null,
      warehouseProvinceName: shop.warehouseProvinceName ?? null,
      warehouseWardCode: shop.warehouseWardCode ?? null,
      warehouseWardName: shop.warehouseWardName ?? null,
      createdAt: shop.createdAt,
      owner: {
        id: shop.owner.id,
        displayName: shop.owner.displayName,
        email: shop.owner.email,
        phone: shop.owner.phone,
      },
      registeredCategories: shop.registeredCategories.map((item) => ({
        categoryId: item.category.id,
        categoryName: item.category.name,
        registrationStatus: item.registrationStatus,
      })),
    },
    legalProfile: {
      documents: shopDocuments,
      documentGroups: groupShopDocuments(shopDocuments),
    },
    identityProfile: shop.owner.kyc
      ? {
          id: shop.owner.kyc.id,
          userId: shop.owner.kyc.userId,
          fullName: shop.owner.kyc.fullName,
          dateOfBirth: shop.owner.kyc.dateOfBirth,
          idType: shop.owner.kyc.idType,
          kycLevel: shop.owner.kyc.kycLevel,
          verificationStatus: shop.owner.kyc.verificationStatus,
          reviewNote: shop.owner.kyc.reviewNote ?? null,
          verifiedAt: shop.owner.kyc.verifiedAt ?? null,
          documents: shop.owner.kyc.documents.map((document) => ({
            id: document.id,
            side: document.side,
            mediaAssetId: document.mediaAssetId,
            assetType: document.mediaAsset.assetType,
            mimeType: document.mediaAsset.mimeType ?? null,
            publicId: document.mediaAsset.publicId ?? null,
            fileUrl: document.mediaAsset.secureUrl,
            uploadedAt: document.uploadedAt,
          })),
        }
      : null,
  };
}

function groupShopDocuments(shopDocuments: ReturnType<typeof toShopDocumentResponse>[]) {
  return Object.values(
    shopDocuments.reduce<Record<string, typeof shopDocuments>>((accumulator, document) => {
      accumulator[document.docType] ??= [];
      accumulator[document.docType].push(document);
      return accumulator;
    }, {}),
  ).map((documents) => ({
    docType: documents[0].docType,
    ...groupLatestAndHistory(documents),
  }));
}
