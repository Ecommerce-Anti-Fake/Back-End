import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LiveCommerceRepository } from '../../infrastructure/persistence/live-commerce.repository';
import { toLiveSessionResponse } from '../live-commerce.mapper';

@Injectable()
export class RemindLiveSessionUseCase {
  constructor(
    private readonly liveCommerceRepository: LiveCommerceRepository,
  ) {}

  async execute(input: { sessionId: string; requesterUserId: string }) {
    const updatedSession = await this.liveCommerceRepository.remindLiveSession({
      sessionId: input.sessionId,
      userId: input.requesterUserId,
    });
    if (!updatedSession) {
      throw new NotFoundException('Live session not found');
    }
    if (updatedSession.status !== 'SCHEDULED') {
      throw new BadRequestException(
        'Only scheduled live sessions can receive reminders',
      );
    }

    return toLiveSessionResponse(updatedSession, input.requesterUserId);
  }
}
