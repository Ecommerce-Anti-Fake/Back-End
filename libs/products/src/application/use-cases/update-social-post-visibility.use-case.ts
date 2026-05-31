import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toSocialPostResponse } from './products.mapper';

@Injectable()
export class UpdateSocialPostVisibilityUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: {
    postId: string;
    requesterUserId: string;
    requesterRole?: string | null;
    visibility: 'PUBLIC' | 'HIDDEN';
  }) {
    const post = await this.productRepository.findSocialPostById(input.postId, input.requesterUserId);
    if (!post) {
      throw new NotFoundException('Social post not found');
    }
    if (post.authorUserId !== input.requesterUserId && input.requesterRole !== 'admin') {
      throw new ForbiddenException('Only author or admin can update post visibility');
    }

    const updatedPost = await this.productRepository.updateSocialPostVisibility(input);
    return toSocialPostResponse(updatedPost, input.requesterUserId);
  }
}
