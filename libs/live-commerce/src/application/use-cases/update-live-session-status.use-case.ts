import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LiveCommerceRepository } from '../../infrastructure/persistence/live-commerce.repository';
import { toLiveSessionResponse } from '../live-commerce.mapper';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['CANCELLED'],
  LIVE: ['ENDED', 'CANCELLED'],
  ENDED: [],
  CANCELLED: [],
};

@Injectable()
export class UpdateLiveSessionStatusUseCase {
  constructor(
    private readonly liveCommerceRepository: LiveCommerceRepository,
  ) {}

  async execute(input: {
    sessionId: string;
    requesterUserId: string;
    requesterRole?: string | null;
    status: 'ENDED' | 'CANCELLED';
  }) {
    const session = await this.liveCommerceRepository.findLiveSessionById(
      input.sessionId,
      input.requesterUserId,
    );
    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    const shop = await this.liveCommerceRepository.findShopForLiveSession(
      session.shopId,
    );
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    if (
      input.requesterRole !== 'admin' &&
      shop.ownerUserId !== input.requesterUserId
    ) {
      throw new ForbiddenException(
        'Only shop owner or admin can update live session status',
      );
    }

    if (session.status === input.status) {
      return toLiveSessionResponse(session, input.requesterUserId);
    }

    if (!ALLOWED_TRANSITIONS[session.status]?.includes(input.status)) {
      throw new BadRequestException(
        `Cannot move live session from ${session.status} to ${input.status}`,
      );
    }

    const updatedSession =
      await this.liveCommerceRepository.updateLiveSessionStatus({
        sessionId: input.sessionId,
        requesterUserId: input.requesterUserId,
        status: input.status,
        ...(input.status === 'ENDED' ? { actualEndedAt: new Date() } : {}),
      });
    return toLiveSessionResponse(updatedSession, input.requesterUserId);
  }
}
