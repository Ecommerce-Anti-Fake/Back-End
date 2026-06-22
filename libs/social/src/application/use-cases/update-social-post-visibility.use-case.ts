import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SocialRepository } from '../../infrastructure/persistence/social.repository';
import { toSocialPostResponse } from '../social.mapper';

@Injectable()
export class UpdateSocialPostVisibilityUseCase {
  constructor(private readonly socialRepository: SocialRepository) {}

  async execute(input: {
    postId: string;
    requesterUserId: string;
    requesterRole?: string | null;
    visibility: 'PUBLIC' | 'HIDDEN';
  }) {
    const post = await this.socialRepository.findSocialPostById(
      input.postId,
      input.requesterUserId,
    );
    if (!post) {
      throw new NotFoundException('Social post not found');
    }
    if (
      post.authorUserId !== input.requesterUserId &&
      input.requesterRole !== 'admin'
    ) {
      throw new ForbiddenException(
        'Only author or admin can update post visibility',
      );
    }

    const updatedPost =
      await this.socialRepository.updateSocialPostVisibility(input);
    return toSocialPostResponse(updatedPost, input.requesterUserId);
  }
}
