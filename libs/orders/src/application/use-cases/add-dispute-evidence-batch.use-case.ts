import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaService } from '@media';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toDisputeEvidenceResponse } from './dispute-evidence.mapper';

@Injectable()
export class AddDisputeEvidenceBatchUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    disputeId: string;
    requesterUserId: string;
    items: Array<{
      assetType: 'IMAGE' | 'VIDEO' | 'RAW';
      mimeType: string;
      fileUrl: string;
      publicId: string;
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
      throw new ForbiddenException('You do not have permission to add evidence for this dispute');
    }

    if (input.items.length === 0) {
      throw new BadRequestException('At least one evidence item is required');
    }

    const responses: Array<ReturnType<typeof toDisputeEvidenceResponse>> = [];

    for (const item of input.items) {
      if (!this.mediaService.isOwnedCloudinaryUrl(item.fileUrl)) {
        throw new BadRequestException('Evidence URL must belong to the configured Cloudinary cloud');
      }

      const publicId = item.publicId.trim();
      if (!publicId.startsWith(`disputes/${dispute.id}/`)) {
        throw new BadRequestException('Evidence public ID does not belong to this dispute folder');
      }

      const mimeType = item.mimeType.trim().toLowerCase();
      if (!mimeType) {
        throw new BadRequestException('MIME type is required');
      }

      const mediaAsset = await this.mediaService.createCloudinaryAsset({
        ownerUserId: input.requesterUserId,
        assetType: item.assetType,
        resourceType: 'DISPUTE_EVIDENCE',
        publicId,
        secureUrl: item.fileUrl,
        mimeType,
        folder: `disputes/${dispute.id}`,
      });

      const evidence = await this.ordersRepository.createDisputeEvidence({
        disputeId: dispute.id,
        uploadedByUserId: input.requesterUserId,
        mediaAssetId: mediaAsset.id,
        fileType: mimeType,
        fileUrl: item.fileUrl,
      });

      responses.push(toDisputeEvidenceResponse(evidence));
    }

    await this.ordersRepository.createAuditLog({
      targetType: 'DISPUTE',
      targetId: dispute.id,
      actorUserId: input.requesterUserId,
      action: 'DISPUTE_EVIDENCE_ADDED',
      note: `${input.items.length} evidence item(s) added`,
      metadata: {
        assetTypes: input.items.map((item) => item.assetType),
      },
    });

    return responses;
  }
}
