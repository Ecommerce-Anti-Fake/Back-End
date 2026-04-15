import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { toDistributionNetworkResponse } from './network.mapper';

@Injectable()
export class CreateDistributionNetworkUseCase {
  constructor(private readonly repository: DistributionPricingRepository) {}

  async execute(input: {
    requesterUserId: string;
    brandId: string;
    manufacturerShopId: string;
    networkName: string;
  }) {
    const brand = await this.repository.findBrandById(input.brandId);
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    const manufacturerShop = await this.repository.findOwnedManufacturerShop(
      input.manufacturerShopId,
      input.requesterUserId,
    );
    if (!manufacturerShop) {
      throw new BadRequestException('Manufacturer shop is invalid or not owned by current user');
    }

    const network = await this.repository.createNetworkWithRootNode({
      brandId: input.brandId,
      manufacturerShopId: input.manufacturerShopId,
      networkName: input.networkName.trim(),
    });

    return toDistributionNetworkResponse(network);
  }
}
