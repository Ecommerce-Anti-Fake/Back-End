import { Injectable } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

@Injectable()
export class GetAdminShopVerificationSummaryUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute() {
    const counts = await this.shopsRepository.countShopsByStatusAndRegistrationType();

    return {
      total: Object.values(counts.byShopStatus).reduce((sum, count) => sum + count, 0),
      byShopStatus: {
        pending_kyc: counts.byShopStatus.pending_kyc ?? 0,
        pending_verification: counts.byShopStatus.pending_verification ?? 0,
        active: counts.byShopStatus.active ?? 0,
      },
      byRegistrationType: {
        NORMAL: counts.byRegistrationType.NORMAL ?? 0,
        HANDMADE: counts.byRegistrationType.HANDMADE ?? 0,
        MANUFACTURER: counts.byRegistrationType.MANUFACTURER ?? 0,
        DISTRIBUTOR: counts.byRegistrationType.DISTRIBUTOR ?? 0,
      },
    };
  }
}
