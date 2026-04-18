import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaService } from '@media';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

@Injectable()
export class GetBrandAuthorizationUploadSignaturesUseCase {
  constructor(
    private readonly shopsRepository: ShopsRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    shopId: string;
    brandId: string;
    requesterUserId: string;
  }) {
    const shop = await this.shopsRepository.findOwnedShop(input.shopId, input.requesterUserId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const brand = await this.shopsRepository.findBrandById(input.brandId);
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    if (!['MANUFACTURER', 'DISTRIBUTOR'].includes(shop.registrationType)) {
      throw new BadRequestException('Brand authorization is only available for manufacturer or distributor shops');
    }

    return [
      this.mediaService.createCloudinaryUploadSignature({
        folder: `shops/${shop.id}/brands/${input.brandId}`,
        requesterUserId: input.requesterUserId,
        assetType: 'RAW',
      }),
    ];
  }
}
