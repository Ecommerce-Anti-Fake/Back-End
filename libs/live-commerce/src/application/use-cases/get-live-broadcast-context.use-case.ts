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
    requesterUserId: string;
    requesterRole?: string | null;
  }) {
    const session = await this.liveCommerceRepository.findLiveSessionById(
      input.sessionId,
    );
    if (!session) {
      throw new NotFoundException('Live session not found');
    }
    if (
      input.requesterRole !== 'admin' &&
      session.shop.ownerUserId !== input.requesterUserId
    ) {
      throw new ForbiddenException('You do not own this live session');
    }
    if (!session.streamProviderSessionId) {
      throw new BadRequestException(
        'Live session has no managed broadcast input',
      );
    }

    return {
      sessionId: session.id,
      shopId: session.shopId,
      status: session.status,
      streamProvider: session.streamProvider,
      providerSessionId: session.streamProviderSessionId,
    };
  }
}
