import { Injectable, NotFoundException } from '@nestjs/common';
import { LiveCommerceRepository } from '../../infrastructure/persistence/live-commerce.repository';
import { toLiveSessionResponse } from '../live-commerce.mapper';

@Injectable()
export class GetLiveSessionUseCase {
  constructor(
    private readonly liveCommerceRepository: LiveCommerceRepository,
  ) {}

  async execute(input: {
    sessionId: string;
    requesterUserId?: string | null;
  }) {
    const session = await this.liveCommerceRepository.findLiveSessionById(
      input.sessionId,
      input.requesterUserId,
    );
    if (!session || session.status === 'CANCELLED') {
      throw new NotFoundException('Live session not found');
    }

    return toLiveSessionResponse(session, input.requesterUserId);
  }
}
