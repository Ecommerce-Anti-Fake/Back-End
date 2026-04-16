import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaService } from '@media';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

@Injectable()
export class GetCategoryDocumentUploadSignaturesUseCase {
  constructor(
    private readonly shopsRepository: ShopsRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    shopId: string;
    categoryId: string;
    requesterUserId: string;
    items: Array<{ documentType: string }>;
  }) {
    const shop = await this.shopsRepository.findOwnedShop(input.shopId, input.requesterUserId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const registration = await this.shopsRepository.findShopBusinessCategory(input.shopId, input.categoryId);
    if (!registration) {
      throw new NotFoundException('Shop category registration not found');
    }

    if (input.items.length === 0) {
      throw new BadRequestException('At least one category document is required');
    }

    return input.items.map((_, index) =>
      this.mediaService.createCloudinaryUploadSignature({
        folder: `shops/${shop.id}/categories/${input.categoryId}`,
        requesterUserId: input.requesterUserId,
        assetType: 'IMAGE',
        sequence: index + 1,
      }),
    );
  }
}
