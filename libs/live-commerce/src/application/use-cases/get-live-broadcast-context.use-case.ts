import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LiveCommerceRepository } from '../../infrastructure/persistence/live-commerce.repository';

@Injectable()
export class GetLiveBroadcastContextUseCase {
  constructor(
    private readonly liveCommerceRepository: LiveCommerceRepository,
  ) {}

  async execute(input: {
    sessionId: string;
    requesterUserId?: string | null;
    accessRole?: 'owner' | 'subscriber' | 'auto';
  }) {
    const session = await this.liveCommerceRepository.findLiveSessionById(
      input.sessionId,
    );
    if (!session) {
      throw new NotFoundException('Live session not found');
    }
    const isOwner = Boolean(
      input.requesterUserId &&
      session.shop.ownerUserId === input.requesterUserId,
    );
    const accessRole = input.accessRole ?? 'owner';
    if (accessRole === 'owner' && !isOwner) {
      throw new ForbiddenException('You do not own this live session');
    }
    const rtcRole =
      accessRole === 'subscriber'
        ? 'SUBSCRIBER'
        : isOwner
          ? 'PUBLISHER'
          : 'SUBSCRIBER';
    if (
      ['ENDED', 'CANCELLED'].includes(session.status) ||
      (rtcRole === 'SUBSCRIBER' && session.status !== 'LIVE')
    ) {
      throw new BadRequestException(
        'Agora access is unavailable for this live session state',
      );
    }
    return {
      sessionId: session.id,
      shopId: session.shopId,
      status: session.status,
      streamProvider: session.streamProvider,
      providerSessionId: session.streamProviderSessionId ?? null,
      rtcRole,
    };
  }
}
