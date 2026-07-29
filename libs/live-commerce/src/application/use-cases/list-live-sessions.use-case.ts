import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LiveCommerceRepository } from '../../infrastructure/persistence/live-commerce.repository';
import { toLiveSessionResponse } from '../live-commerce.mapper';

@Injectable()
export class ListLiveSessionsUseCase {
  constructor(
    private readonly liveCommerceRepository: LiveCommerceRepository,
  ) {}

  async execute(input: {
    requesterUserId?: string | null;
    requesterRole?: string | null;
    filter?: 'all' | 'live' | 'upcoming';
    q?: string | null;
    shopId?: string | null;
  }) {
    const { requesterRole, ...filters } = input;
    let includeTerminal = false;
    if (input.filter === 'all' && input.shopId) {
      if (!input.requesterUserId) {
        throw new UnauthorizedException(
          'Authentication is required to list all shop live sessions',
        );
      }
      const shop = await this.liveCommerceRepository.findShopForLiveSession(
        input.shopId,
      );
      if (!shop) {
        throw new NotFoundException('Shop not found');
      }
      if (
        requesterRole !== 'admin' &&
        shop.ownerUserId !== input.requesterUserId
      ) {
        throw new ForbiddenException(
          'Only shop owner or admin can list all shop live sessions',
        );
      }
      includeTerminal = true;
    }

    const sessions = await this.liveCommerceRepository.listLiveSessions({
      ...filters,
      ...(includeTerminal ? { includeTerminal: true } : {}),
    });
    return sessions.map((session) =>
      toLiveSessionResponse(session, input.requesterUserId),
    );
  }
}
