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

type ShopCategoryDocumentRecord = {
  id: string;
  documentType: string;
  fileUrl: string;
  mediaAssetId: string | null;
  documentNumber: string | null;
  issuedBy: string | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  reviewStatus: string;
  reviewNote: string | null;
  reviewedAt: Date | null;
  uploadedAt: Date;
};

type VerificationSummaryRecord = {
  id: string;
  shopStatus: string;
  registrationType: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
  documents: Array<{ reviewStatus: string }>;
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
    documents: Array<{ reviewStatus: string }>;
  }>;
  owner: {
    kyc: {
      verificationStatus: string;
      documents: Array<{
        side: 'FRONT' | 'BACK';
      }>;
    } | null;
  };
};

export function toShopDocumentResponse(document: ShopDocumentRecord) {
  const files = [...(document.files ?? [])].sort((left, right) => left.sortOrder - right.sortOrder);
  const firstFile = files[0] ?? null;

  return {
    id: document.id,
    requirementId: document.requirementId ?? null,
    docType: document.docType,
    fileUrl: firstFile?.fileUrl ?? '',
    mediaAssetId: firstFile?.mediaAssetId ?? null,
    files,
    reviewStatus: document.reviewStatus,
    reviewNote: document.reviewNote,
    reviewedAt: document.reviewedAt,
    uploadedAt: document.uploadedAt,
  };
}

export function toShopCategoryDocumentResponse(document: ShopCategoryDocumentRecord) {
  return {
    id: document.id,
    documentType: document.documentType,
    fileUrl: document.fileUrl,
    mediaAssetId: document.mediaAssetId,
    documentNumber: document.documentNumber,
    issuedBy: document.issuedBy,
    issuedAt: document.issuedAt,
    expiresAt: document.expiresAt,
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
  const requiresShopDocuments =
    shop.registrationType === 'MANUFACTURER' || shop.registrationType === 'DISTRIBUTOR';
  const approvedShopDocuments = shop.documents.filter((document) => document.reviewStatus === 'approved').length;
  const hasApprovedShopDocument = approvedShopDocuments > 0;

  const categories = shop.registeredCategories.map((registration) => {
    const requiredVerification = registration.category.riskTier.trim().toLowerCase() !== 'low';
    const approvedDocumentCount = registration.documents.filter(
      (document) => document.reviewStatus === 'approved',
    ).length;

    return {
      categoryId: registration.category.id,
      categoryName: registration.category.name,
      riskTier: registration.category.riskTier,
      requiredVerification,
      registrationStatus: registration.registrationStatus,
      reviewNote: registration.reviewNote,
      approvedAt: registration.approvedAt,
      documentCount: registration.documents.length,
      approvedDocumentCount,
    };
  });

  const missingRequirements: string[] = [];
  if (kycStatus !== 'approved' || !hasRequiredKycDocuments) {
    missingRequirements.push('KYC_APPROVAL_REQUIRED');
  }
  if (requiresShopDocuments && !hasApprovedShopDocument) {
    missingRequirements.push('SHOP_DOCUMENT_APPROVAL_REQUIRED');
  }
  if (categories.some((category) => category.requiredVerification && category.registrationStatus !== 'approved')) {
    missingRequirements.push('CATEGORY_APPROVAL_REQUIRED');
  }

  return {
    shopId: shop.id,
    shopStatus: shop.shopStatus,
    registrationType: shop.registrationType,
    canOperate: shop.shopStatus === 'active',
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
  ownerUserId: string;
  registrationType: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
  shopStatus: string;
  createdAt: Date;
  owner: {
    displayName: string | null;
    email: string | null;
    phone: string | null;
  };
  documents: Array<{ reviewStatus: string }>;
  registeredCategories: Array<{
    registrationStatus: string;
    category: {
      id: string;
      name: string;
    };
  }>;
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
  createdAt: Date;
  documents: Array<ShopDocumentRecord>;
  owner: VerificationSummaryRecord['owner'] & {
    id: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
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
      documents: Array<ShopCategoryDocumentRecord>;
    }
  >;
};

export function toPendingVerificationShopResponse(shop: PendingVerificationShopRecord) {
  const approvedShopDocumentCount = shop.documents.filter((document) => document.reviewStatus === 'approved').length;

  return {
    id: shop.id,
    shopName: shop.shopName,
    ownerUserId: shop.ownerUserId,
    ownerDisplayName: shop.owner.displayName,
    ownerEmail: shop.owner.email,
    ownerPhone: shop.owner.phone,
    registrationType: shop.registrationType,
    shopStatus: shop.shopStatus,
    shopDocumentCount: shop.documents.length,
    approvedShopDocumentCount,
    registeredCategories: shop.registeredCategories.map((item) => ({
      categoryId: item.category.id,
      categoryName: item.category.name,
      registrationStatus: item.registrationStatus,
    })),
    createdAt: shop.createdAt,
  };
}

export function toAdminShopVerificationDetailResponse(shop: AdminVerificationDetailRecord, timeline: AuditLogRecord[]) {
  const shopDocuments = shop.documents.map(toShopDocumentResponse);
  const categoryDocuments = shop.registeredCategories.flatMap((registration) =>
    registration.documents.map((document) => ({
      ...toShopCategoryDocumentResponse(document),
      categoryId: registration.category.id,
      categoryName: registration.category.name,
    })),
  );

  const shopDocumentGroups = Object.values(
    shopDocuments.reduce<Record<string, typeof shopDocuments>>((accumulator, document) => {
      accumulator[document.docType] ??= [];
      accumulator[document.docType].push(document);
      return accumulator;
    }, {}),
  ).map((documents) => ({
    docType: documents[0].docType,
    ...groupLatestAndHistory(documents),
  }));

  const categoryDocumentGroups = Object.values(
    categoryDocuments.reduce<Record<string, typeof categoryDocuments>>((accumulator, document) => {
      const key = `${document.categoryId}:${document.documentType}`;
      accumulator[key] ??= [];
      accumulator[key].push(document);
      return accumulator;
    }, {}),
  ).map((documents) => ({
    categoryId: documents[0].categoryId,
    categoryName: documents[0].categoryName,
    documentType: documents[0].documentType,
    ...groupLatestAndHistory(documents),
  }));

  return {
    shop: {
      id: shop.id,
      ownerUserId: shop.ownerUserId,
      shopName: shop.shopName,
      registrationType: shop.registrationType,
      shopType: shop.shopType
        ? {
            id: shop.shopType.id,
            code: shop.shopType.code,
            name: shop.shopType.name,
            description: shop.shopType.description,
          }
        : null,
      businessType: shop.businessType,
      taxCode: shop.taxCode,
      shopStatus: shop.shopStatus,
      createdAt: shop.createdAt,
      registeredCategories: shop.registeredCategories.map((item) => ({
        categoryId: item.category.id,
        categoryName: item.category.name,
        registrationStatus: item.registrationStatus,
      })),
    },
    summary: toShopVerificationSummaryResponse(shop),
    shopDocumentRequirements:
      shop.shopType?.requirements.map((item) => {
        const document =
          shopDocuments.find((shopDocument) => shopDocument.requirementId === item.requirement.id) ??
          shopDocuments.find((shopDocument) => shopDocument.docType === item.requirement.code) ??
          null;

        return {
          id: item.requirement.id,
          code: item.requirement.code,
          name: item.requirement.name,
          description: item.requirement.description,
          required: item.required,
          multipleFilesAllowed: item.requirement.multipleFilesAllowed,
          sortOrder: item.sortOrder,
          document,
        };
      }) ?? [],
    shopDocuments,
    categoryDocuments,
    shopDocumentGroups,
    categoryDocumentGroups,
    timeline: timeline.map(toAuditLogResponse),
  };
}
