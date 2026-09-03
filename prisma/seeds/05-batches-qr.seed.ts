import { PrismaClient } from '@prisma/client';
import {
  COUNTS,
  createMediaAsset,
  documentUrl,
  gtin,
  id,
  money,
  pick,
  recentDate,
  SeedContext,
  sha256,
  uatQrCode,
} from './00-utils';

export async function seedBatchesQr(prisma: PrismaClient, ctx: SeedContext) {
  for (let i = 0; i < COUNTS.supplyBatches; i += 1) {
    const offer = pick(ctx.offers, i);
    const shop =
      ctx.shops.find((item) => item.id === offer.shopId) ?? pick(ctx.shops, i);
    const batch = await prisma.supplyBatch.create({
      data: {
        id: id(),
        shopId: shop.id,
        brandId: offer.brandId,
        categoryId: offer.categoryId,
        distributionNodeId: null,
        modelName: offer.modelName,
        gtin: offer.gtin ?? gtin(i + 900),
        verificationPolicy: offer.verificationPolicy,
        batchNumber: `UAT-BATCH-${String(i + 1).padStart(4, '0')}`,
        quantity: 150 + (i % 10) * 50,
        sourceName: shop.shopName,
        countryOfOrigin: 'Việt Nam',
        sourceType: i % 3 === 0 ? 'MANUFACTURING' : 'AUTHORIZED_DISTRIBUTION',
        receivedAt: recentDate(50 - (i % 40)),
      },
    });
    ctx.batches.push(batch);

    const media = await createMediaAsset(prisma, {
      ownerUserId: shop.ownerUserId,
      resourceType: 'BATCH_DOCUMENT',
      secureUrl: documentUrl(`batch-${batch.id}`),
      publicId: `uat/batch-documents/${batch.id}`,
      mimeType: 'application/pdf',
      assetType: 'RAW',
    });
    await prisma.batchDocument.create({
      data: {
        id: id(),
        batchId: batch.id,
        mediaAssetId: media.id,
        docType: i % 2 === 0 ? 'MANUFACTURING_RECORD' : 'CO_CQ',
        fileUrl: media.secureUrl,
        issuerName: shop.shopName,
        documentNumberHash: sha256(`batch-doc-${batch.id}`),
        reviewStatus: i % 8 === 0 ? 'pending' : 'approved',
        uploadedAt: recentDate(45 - (i % 30)),
      },
    });
  }

  for (let i = 0; i < COUNTS.offerBatchLinks; i += 1) {
    const offer = pick(ctx.offers, i);
    const batch = pick(ctx.batches, i);
    await prisma.offerBatchLink.upsert({
      where: { offerId_batchId: { offerId: offer.id, batchId: batch.id } },
      update: {},
      create: {
        id: id(),
        offerId: offer.id,
        batchId: batch.id,
        allocatedQuantity: 20 + (i % 12) * 5,
      },
    });
  }

  for (let i = 0; i < COUNTS.verificationLabels; i += 1) {
    const batch = pick(ctx.batches, i);
    const label = await prisma.verificationLabel.create({
      data: {
        id: id(),
        brandId: batch.brandId,
        labelType: i % 2 === 0 ? 'QR_PRODUCT' : 'QR_BATCH',
        codeHash: sha256(
          i === 3
            ? uatQrCode()
            : `UAT-QR-${String(i + 1).padStart(4, '0')}-${batch.id}`,
        ),
        issuerType: 'PLATFORM',
        labelStatus: i % 20 === 0 ? 'suspicious' : 'active',
        scopeType: 'SUPPLY_BATCH',
        scopeId: batch.id,
        issuedAt: recentDate(40 - (i % 30)),
      },
    });
    ctx.labels.push({
      id: label.id,
      brandId: label.brandId,
      scopeId: label.scopeId,
    });
  }

  const eventTypes = ['CREATED', 'PACKAGED', 'DISTRIBUTED', 'VERIFIED'];
  for (let i = 0; i < COUNTS.provenanceEvents; i += 1) {
    const label = pick(ctx.labels, i);
    const actor = pick(ctx.users, i);
    const eventType = eventTypes[i % eventTypes.length];
    await prisma.provenanceEvent.create({
      data: {
        id: id(),
        labelId: label.id,
        eventType,
        actorUserId: actor.id,
        actorRole: actor.role,
        channel: i % 4 === 0 ? 'mobile_scan' : 'system',
        contextType: eventType === 'VERIFIED' ? 'SCAN' : 'SUPPLY_BATCH',
        contextId: label.scopeId,
        payloadHash: sha256(`provenance-${label.id}-${i}`),
        occurredAt: recentDate(30 - (i % 30)),
      },
    });
  }

  const targets = [
    ...ctx.offers.map((item) => ['OFFER', item.id] as const),
    ...ctx.shops.map((item) => ['SHOP', item.id] as const),
  ];
  for (let i = 0; i < COUNTS.riskScores; i += 1) {
    const [targetType, targetId] = pick(targets, i);
    const score = 10 + ((i * 7) % 90);
    await prisma.riskScore.create({
      data: {
        id: id(),
        targetType,
        targetId,
        score: money(score),
        riskLevel: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
        factorSummary:
          'Seed score dựa trên trạng thái xác minh, báo cáo và lịch sử giao dịch.',
        calculatedAt: recentDate(i % 20),
      },
    });
  }
}
