import { Injectable } from '@nestjs/common';
import { LiveCommerceRepository } from '../../infrastructure/persistence/live-commerce.repository';
import { toLiveSessionResponse } from '../live-commerce.mapper';

@Injectable()
export class ListLiveSessionsUseCase {
  constructor(
    private readonly liveCommerceRepository: LiveCommerceRepository,
  ) {}

  async execute(input: {
    requesterUserId?: string | null;
    filter?: 'all' | 'live' | 'upcoming';
    q?: string | null;
  }) {
    const sessions = await this.liveCommerceRepository.listLiveSessions(input);
    return sessions.map((session) =>
      toLiveSessionResponse(session, input.requesterUserId),
    );
  }
}
