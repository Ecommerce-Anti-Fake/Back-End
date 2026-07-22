import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';

@Injectable()
export class GetUserByIdUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(id: string) {
    const detail = await this.usersRepository.findAdminUserDetailById(id);
    if (!detail) {
      throw new NotFoundException('User not found');
    }

    const { user, shopMetrics } = detail;
    const shop = user.ownedShops[0];
    const sellerVerified = shop?.shopStatus === 'verified';

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        avatar: user.avatarMedia?.secureUrl ?? null,
        email: user.email,
        phone: user.phone,
        address: user.addresses[0]?.addressLine ?? null,
        role: user.role,
        accountStatus: user.accountStatus,
        emailVerified: Boolean(user.emailVerifiedAt),
        phoneVerified: Boolean(user.phoneVerifiedAt),
        sellerVerified,
        joinedAt: user.createdAt,
        updatedAt: user.updatedAt,
        statistics: {
          orders: detail.orders,
          posts: detail.posts,
          reports: detail.reports,
          positiveRate:
            detail.receivedReviews === 0
              ? 0
              : Math.round(
                  (detail.positiveReviews / detail.receivedReviews) * 100,
                ),
        },
      },
      shop:
        shop && shopMetrics
          ? {
              id: shop.id,
              shopName: shop.shopName,
              logo: shop.avatarMedia?.secureUrl ?? null,
              banner: shop.bannerMedia?.secureUrl ?? null,
              shopStatus: shop.shopStatus,
              verificationStatus: sellerVerified
                ? 'verified'
                : shop.shopStatus === 'rejected'
                  ? 'rejected'
                  : 'pending',
              createdAt: shop.createdAt,
              category:
                shop.registeredCategories
                  .map(({ category }) => category.name)
                  .join(', ') || null,
              address: shop.warehouseAddress ?? null,
              rating: shopMetrics.rating,
              reviewCount: shopMetrics.reviewCount,
              productCount: shop._count.offers,
              totalSold: shopMetrics.totalSold,
              revenue: shopMetrics.revenue,
            }
          : null,
    };
  }
}
