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
}
