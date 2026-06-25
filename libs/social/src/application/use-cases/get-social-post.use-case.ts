import { Injectable, NotFoundException } from '@nestjs/common';
import { SocialRepository } from '../../infrastructure/persistence/social.repository';
import { toSocialPostResponse } from '../social.mapper';

@Injectable()
export class GetSocialPostUseCase {
  constructor(private readonly socialRepository: SocialRepository) {}

  async execute(input: {
    postId: string;
    requesterUserId?: string | null;
    requesterRole?: string | null;
  }) {
    const post = await this.socialRepository.findSocialPostById(
      input.postId,
      input.requesterUserId,
    );
    if (
      !post ||
      (post.visibility !== 'PUBLIC' &&
        post.authorUserId !== input.requesterUserId &&
        input.requesterRole !== 'admin')
    ) {
      throw new NotFoundException('Social post not found');
    }

    return toSocialPostResponse(post, input.requesterUserId);
  }
}
