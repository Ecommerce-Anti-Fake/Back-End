import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toLiveCommentResponse } from './products.mapper';

@Injectable()
export class UpdateLiveCommentVisibilityUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: {
    sessionId: string;
    commentId: string;
    requesterUserId: string;
    requesterRole?: string | null;
    visibility: 'PUBLIC' | 'HIDDEN';
  }) {
    if (input.requesterRole !== 'admin') {
      throw new ForbiddenException('Only admin can moderate live comments');
    }

    const session = await this.productRepository.findLiveSessionById(input.sessionId, input.requesterUserId);
    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    const comment = await this.productRepository.updateLiveCommentVisibility(input);
    return toLiveCommentResponse(comment);
  }
}
