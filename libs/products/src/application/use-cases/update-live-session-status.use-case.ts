import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toLiveSessionResponse } from './products.mapper';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['LIVE', 'CANCELLED'],
  LIVE: ['ENDED', 'CANCELLED'],
  ENDED: [],
  CANCELLED: [],
};

@Injectable()
export class UpdateLiveSessionStatusUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: {
    sessionId: string;
    requesterUserId: string;
    requesterRole?: string | null;
    status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
  }) {
    const session = await this.productRepository.findLiveSessionById(input.sessionId, input.requesterUserId);
    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    const shop = await this.productRepository.findShopForLiveSession(session.shopId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    if (input.requesterRole !== 'admin' && shop.ownerUserId !== input.requesterUserId) {
      throw new ForbiddenException('Only shop owner or admin can update live session status');
    }

    if (session.status === input.status) {
      return toLiveSessionResponse(session, input.requesterUserId);
    }

    if (!ALLOWED_TRANSITIONS[session.status]?.includes(input.status)) {
      throw new BadRequestException(`Cannot move live session from ${session.status} to ${input.status}`);
    }

    const updatedSession = await this.productRepository.updateLiveSessionStatus({
      sessionId: input.sessionId,
      requesterUserId: input.requesterUserId,
      status: input.status,
    });
    return toLiveSessionResponse(updatedSession, input.requesterUserId);
  }
}
