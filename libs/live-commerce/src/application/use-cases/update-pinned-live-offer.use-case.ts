import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LiveCommerceRepository } from '../../infrastructure/persistence/live-commerce.repository';
import { toLiveSessionResponse } from '../live-commerce.mapper';

@Injectable()
export class UpdatePinnedLiveOfferUseCase {
  constructor(
    private readonly liveCommerceRepository: LiveCommerceRepository,
  ) {}

  async execute(input: {
    sessionId: string;
    requesterUserId: string;
    requesterRole?: string | null;
    offerId: string | null;
  }) {
    const session = await this.liveCommerceRepository.findLiveSessionById(
      input.sessionId,
      input.requesterUserId,
    );
    if (!session) {
      throw new NotFoundException('Live session not found');
    }
    await this.assertCanManage(
      session.shopId,
      input.requesterUserId,
      input.requesterRole,
    );
    assertMutableStatus(session.status);

    const result = await this.liveCommerceRepository.updatePinnedOfferAtomic({
      sessionId: input.sessionId,
      offerId: input.offerId,
      requesterUserId: input.requesterUserId,
    });
    if (result.kind === 'NOT_FOUND') {
      throw new NotFoundException('Live session not found');
    }
    if (result.kind === 'INVALID_STATUS') {
      throw new BadRequestException(
        'Only scheduled or live sessions can change the pinned offer',
      );
    }
    if (result.kind === 'INVALID_OFFER') {
      throw new BadRequestException(
        'Pinned offer must be attached, active, in stock, and belong to the session shop',
      );
    }

    return {
      changed: result.changed,
      session: toLiveSessionResponse(result.session, input.requesterUserId),
    };
  }

  private async assertCanManage(
    shopId: string,
    requesterUserId: string,
    requesterRole?: string | null,
  ) {
    const shop =
      await this.liveCommerceRepository.findShopForLiveSession(shopId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    if (requesterRole !== 'admin' && shop.ownerUserId !== requesterUserId) {
      throw new ForbiddenException(
        'Only shop owner or admin can update the pinned live offer',
      );
    }
  }
}

function assertMutableStatus(status: string) {
  if (status !== 'SCHEDULED' && status !== 'LIVE') {
    throw new BadRequestException(
      'Only scheduled or live sessions can change the pinned offer',
    );
  }
}
