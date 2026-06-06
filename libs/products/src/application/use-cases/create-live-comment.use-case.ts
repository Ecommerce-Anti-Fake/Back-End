import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toLiveCommentResponse } from './products.mapper';

@Injectable()
export class CreateLiveCommentUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: {
    sessionId: string;
    requesterUserId: string;
    requesterRole?: string | null;
    body: string;
    clientMessageId?: string | null;
  }) {
    const body = input.body.trim();
    if (!body) {
      throw new BadRequestException('Live comment body is required');
    }

    const session = await this.productRepository.findLiveSessionById(input.sessionId, input.requesterUserId);
    if (!session || session.status === 'CANCELLED') {
      throw new NotFoundException('Live session not found');
    }
    if (session.status !== 'LIVE') {
      throw new BadRequestException('Live session is not accepting comments');
    }

    const comment = await this.productRepository.createLiveComment({
      sessionId: input.sessionId,
      authorUserId: input.requesterUserId,
      body,
      clientMessageId: input.clientMessageId?.trim() || null,
    });

    return toLiveCommentResponse(comment);
  }
}
