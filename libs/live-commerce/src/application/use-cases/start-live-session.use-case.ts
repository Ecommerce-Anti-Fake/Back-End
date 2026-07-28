import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LiveCommerceRepository } from '../../infrastructure/persistence/live-commerce.repository';
import { toLiveSessionResponse } from '../live-commerce.mapper';

@Injectable()
export class StartLiveSessionUseCase {
  constructor(
    private readonly liveCommerceRepository: LiveCommerceRepository,
  ) {}

  async execute(input: { sessionId: string; requesterUserId: string }) {
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
    if (shop.ownerUserId !== input.requesterUserId) {
      throw new ForbiddenException('Only shop owner can start live sessions');
    }

    if (
      session.streamProvider !== 'AGORA_RTC' ||
      !session.streamProviderSessionId
    ) {
      throw new BadRequestException('Live session is not managed by Agora RTC');
    }
    if (session.status !== 'SCHEDULED' && session.status !== 'LIVE') {
      throw new BadRequestException(
        `Cannot start live session from ${session.status}`,
      );
    }

    const transition = await this.liveCommerceRepository.markLiveSessionLive({
      sessionId: input.sessionId,
      requesterUserId: input.requesterUserId,
      startedAt: new Date(),
    });
    if (!transition.session) {
      throw new NotFoundException('Live session not found');
    }
    if (transition.session.status !== 'LIVE') {
      throw new BadRequestException(
        `Cannot start live session from ${transition.session.status}`,
      );
    }
    return {
      ...toLiveSessionResponse(transition.session, input.requesterUserId),
      startedNow: transition.startedNow,
      reminderUserIds: transition.reminderUserIds,
    };
  }
}
