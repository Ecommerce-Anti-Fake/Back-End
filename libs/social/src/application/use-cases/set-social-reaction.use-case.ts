import { Injectable, NotFoundException } from '@nestjs/common';
import { SocialRepository } from '../../infrastructure/persistence/social.repository';
import { toSocialPostResponse } from '../social.mapper';

@Injectable()
export class SetSocialReactionUseCase {
  constructor(private readonly socialRepository: SocialRepository) {}

  async execute(input: {
    postId: string;
    requesterUserId: string;
    reactionType?: 'LIKE';
  }) {
    const post = await this.socialRepository.findSocialPostById(
      input.postId,
      input.requesterUserId,
    );
    if (!post || post.visibility !== 'PUBLIC') {
      throw new NotFoundException('Social post not found');
    }

    const updatedPost = await this.socialRepository.setSocialReaction({
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
  constructor(private readonly socialRepository: SocialRepository) {}

  async execute(input: {
    postId: string;
    requesterUserId: string;
    reactionType?: 'LIKE';
  }) {
    const updatedPost = await this.socialRepository.removeSocialReaction({
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
