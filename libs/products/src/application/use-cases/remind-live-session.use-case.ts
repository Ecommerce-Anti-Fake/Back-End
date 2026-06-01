import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toLiveSessionResponse } from './products.mapper';

@Injectable()
export class RemindLiveSessionUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: { sessionId: string; requesterUserId: string }) {
    const session = await this.productRepository.findLiveSessionById(input.sessionId, input.requesterUserId);
    if (!session) {
      throw new NotFoundException('Live session not found');
    }
    if (session.status !== 'SCHEDULED') {
      throw new BadRequestException('Only scheduled live sessions can receive reminders');
    }

    const updatedSession = await this.productRepository.remindLiveSession({
      sessionId: input.sessionId,
      userId: input.requesterUserId,
    });
    if (!updatedSession) {
      throw new NotFoundException('Live session not found');
    }
    return toLiveSessionResponse(updatedSession, input.requesterUserId);
  }
}
