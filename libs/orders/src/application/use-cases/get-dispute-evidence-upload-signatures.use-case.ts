import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaService } from '@media';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';

@Injectable()
export class GetDisputeEvidenceUploadSignaturesUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    disputeId: string;
    requesterUserId: string;
    items: Array<{
      assetType: 'IMAGE' | 'VIDEO' | 'RAW';
    }>;
  }) {
    const dispute = await this.ordersRepository.findDisputeById(input.disputeId);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const isRetailBuyer = dispute.order.buyerUserId === input.requesterUserId;
    const isWholesaleBuyerOwner = dispute.order.buyerShop?.ownerUserId === input.requesterUserId;
    const isSellerOwner = dispute.order.shop.ownerUserId === input.requesterUserId;

    if (!isRetailBuyer && !isWholesaleBuyerOwner && !isSellerOwner) {
      throw new ForbiddenException('You do not have permission to upload evidence for this dispute');
    }

    return input.items.map((item, index) =>
      this.mediaService.createCloudinaryUploadSignature({
        folder: `disputes/${dispute.id}`,
        requesterUserId: input.requesterUserId,
        assetType: item.assetType,
        sequence: index + 1,
      }),
    );
  }
}
