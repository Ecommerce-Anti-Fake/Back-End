import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toSocialPostResponse } from './products.mapper';

@Injectable()
export class SetSocialReactionUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: { postId: string; requesterUserId: string; reactionType?: 'LIKE' }) {
    const post = await this.productRepository.findSocialPostById(input.postId, input.requesterUserId);
    if (!post || post.visibility !== 'PUBLIC') {
      throw new NotFoundException('Social post not found');
    }

    const updatedPost = await this.productRepository.setSocialReaction({
      postId: input.postId,
      userId: input.requesterUserId,
      reactionType: input.reactionType ?? 'LIKE',
    });
    if (!updatedPost) {
      throw new NotFoundException('Social post not found');
    }

    return toSocialPostResponse(updatedPost, input.requesterUserId);
  }
}

@Injectable()
export class RemoveSocialReactionUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: { postId: string; requesterUserId: string; reactionType?: 'LIKE' }) {
    const updatedPost = await this.productRepository.removeSocialReaction({
      postId: input.postId,
      userId: input.requesterUserId,
      reactionType: input.reactionType ?? 'LIKE',
    });
    if (!updatedPost || updatedPost.visibility !== 'PUBLIC') {
      throw new NotFoundException('Social post not found');
    }

    return toSocialPostResponse(updatedPost, input.requesterUserId);
  }
}
