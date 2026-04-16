import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaService } from '@media';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

@Injectable()
export class GetShopDocumentUploadSignaturesUseCase {
  constructor(
    private readonly shopsRepository: ShopsRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    shopId: string;
    requesterUserId: string;
    items: Array<{ docType: string }>;
  }) {
    const shop = await this.shopsRepository.findOwnedShop(input.shopId, input.requesterUserId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (input.items.length === 0) {
      throw new BadRequestException('At least one shop document is required');
    }

    return input.items.map((_, index) =>
      this.mediaService.createCloudinaryUploadSignature({
        folder: `shops/${shop.id}/documents`,
        requesterUserId: input.requesterUserId,
        assetType: 'IMAGE',
        sequence: index + 1,
      }),
    );
  }
}
