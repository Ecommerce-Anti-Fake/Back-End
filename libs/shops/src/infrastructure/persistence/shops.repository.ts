import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class ShopsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    ownerUserId: string;
    shopName: string;
    registrationType: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
    businessType: string;
    taxCode: string | null;
    shopStatus: string;
    categoryIds: string[];
  }) {
    return this.prisma.shop.create({
      data: {
        ownerUserId: data.ownerUserId,
        shopName: data.shopName,
        registrationType: data.registrationType,
        businessType: data.businessType,
        taxCode: data.taxCode,
        shopStatus: data.shopStatus,
        registeredCategories: {
          create: data.categoryIds.map((categoryId) => ({
            categoryId,
          })),
        },
      },
      include: {
        registeredCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  findById(id: string) {
    return this.prisma.shop.findUnique({
      where: { id },
      include: {
        registeredCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  findByOwnerUserId(ownerUserId: string) {
    return this.prisma.shop.findMany({
      where: { ownerUserId },
      include: {
        registeredCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  countCategoriesByIds(categoryIds: string[]) {
    return this.prisma.category.count({
      where: {
        id: {
          in: categoryIds,
        },
      },
    });
  }
}
