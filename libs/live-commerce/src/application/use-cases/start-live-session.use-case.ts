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

  async execute(input: {
    sessionId: string;
    requesterUserId: string;
    requesterRole?: string | null;
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
        'Only shop owner or admin can start live sessions',
      );
    }

    if (
      session.streamProvider !== 'CLOUDFLARE_STREAM' ||
      !session.streamProviderSessionId
    ) {
      throw new BadRequestException(
        'Live session is not managed by Cloudflare Stream',
      );
    }
    if (session.status === 'LIVE' || session.providerStatus === 'STARTING') {
      return toLiveSessionResponse(session, input.requesterUserId);
    }
    if (session.status !== 'SCHEDULED') {
      throw new BadRequestException(
        `Cannot start live session from ${session.status}`,
      );
    }

    const updatedSession =
      await this.liveCommerceRepository.markLiveSessionStarting({
        sessionId: input.sessionId,
        requesterUserId: input.requesterUserId,
      });
    if (!updatedSession) {
      throw new NotFoundException('Live session not found');
    }
    return toLiveSessionResponse(updatedSession, input.requesterUserId);
  }
}
