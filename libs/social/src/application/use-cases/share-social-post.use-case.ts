import { Injectable, NotFoundException } from '@nestjs/common';
import { SocialRepository } from '../../infrastructure/persistence/social.repository';
import { toSocialPostResponse } from '../social.mapper';

@Injectable()
export class ShareSocialPostUseCase {
  constructor(private readonly socialRepository: SocialRepository) {}

  async execute(input: { postId: string; requesterUserId: string }) {
    const post = await this.socialRepository.findSocialPostById(
      input.postId,
      input.requesterUserId,
    );
    if (!post || post.visibility !== 'PUBLIC') {
      throw new NotFoundException('Social post not found');
    }

    const updatedPost = await this.socialRepository.shareSocialPost({
      postId: input.postId,
      userId: input.requesterUserId,
    });
    if (!updatedPost) {
      throw new NotFoundException('Social post not found');
    }

    return toSocialPostResponse(updatedPost, input.requesterUserId);
  }
}
