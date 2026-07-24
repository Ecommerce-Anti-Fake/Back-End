import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LiveCommerceRepository } from '../../infrastructure/persistence/live-commerce.repository';

@Injectable()
export class GetLiveAnalyticsUseCase {
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
    if (
      input.requesterRole !== 'admin' &&
      session.shop.ownerUserId !== input.requesterUserId
    ) {
      throw new ForbiddenException(
        'Only admin or session shop owner can view live analytics',
      );
    }

    return {
      liveSessionId: input.sessionId,
      ...(await this.liveCommerceRepository.getLiveSessionAnalytics(
        input.sessionId,
      )),
    };
  }
}
