import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toSocialPostResponse } from './products.mapper';

@Injectable()
export class ShareSocialPostUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: { postId: string; requesterUserId: string }) {
    const post = await this.productRepository.findSocialPostById(input.postId, input.requesterUserId);
    if (!post || post.visibility !== 'PUBLIC') {
      throw new NotFoundException('Social post not found');
    }

    const updatedPost = await this.productRepository.shareSocialPost({
      postId: input.postId,
      userId: input.requesterUserId,
    });
    if (!updatedPost) {
      throw new NotFoundException('Social post not found');
    }

    return toSocialPostResponse(updatedPost, input.requesterUserId);
  }
}
