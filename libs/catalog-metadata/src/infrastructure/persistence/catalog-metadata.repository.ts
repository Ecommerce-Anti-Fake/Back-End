import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class CatalogMetadataRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllBrands() {
    return this.prisma.brand.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  createBrand(data: { name: string; registryStatus: string }) {
    return this.prisma.brand.create({
      data,
    });
  }

  findAllCategories() {
    return this.prisma.category.findMany({
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
  }

  findCategoryById(id: string) {
    return this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  createCategory(data: {
    name: string;
    parentId: string | null;
    imageUrl: string | null;
    riskTier: string;
  }) {
    return this.prisma.category.create({
      data,
    });
  }

  findActiveShippingCarriers() {
    return this.prisma.shippingCarrier.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findVerificationLabelByCodeHash(codeHash: string) {
    return this.prisma.verificationLabel.findFirst({
      where: { codeHash },
      select: {
        labelType: true,
        labelStatus: true,
        scopeType: true,
        scopeId: true,
        issuedAt: true,
        brand: { select: { name: true } },
        provenance: {
          orderBy: { occurredAt: 'asc' },
          select: {
            eventType: true,
            channel: true,
            occurredAt: true,
          },
        },
      },
    });
  }

  findSupplyBatchVerificationContext(batchId: string) {
    return this.prisma.supplyBatch
      .findUnique({
        where: { id: batchId },
        select: {
          modelName: true,
          batchNumber: true,
          countryOfOrigin: true,
          sourceType: true,
          offerLinks: {
            take: 1,
            orderBy: { createdAt: 'asc' },
            select: { offer: { select: { title: true } } },
          },
        },
      })
      .then((batch) =>
        batch
          ? {
              modelName: batch.modelName,
              batchNumber: batch.batchNumber,
              countryOfOrigin: batch.countryOfOrigin,
              sourceType: batch.sourceType,
              offerTitle: batch.offerLinks[0]?.offer.title ?? null,
            }
          : null,
      );
  }
}
