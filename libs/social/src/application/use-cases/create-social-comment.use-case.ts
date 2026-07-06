import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SocialRepository } from '../../infrastructure/persistence/social.repository';
import { toSocialPostResponse } from '../social.mapper';

@Injectable()
export class CreateSocialCommentUseCase {
  constructor(private readonly socialRepository: SocialRepository) {}

  async execute(input: {
    postId: string;
    requesterUserId: string;
    body: string;
  }) {
    const body = input.body.trim();
    if (!body) {
      throw new BadRequestException('Comment body is required');
    }

    const post = await this.socialRepository.findSocialPostById(
      input.postId,
      input.requesterUserId,
    );
    if (!post || post.visibility !== 'PUBLIC') {
      throw new NotFoundException('Social post not found');
    }

    const created = await this.socialRepository.createSocialComment({
      postId: input.postId,
      authorUserId: input.requesterUserId,
      body,
    });
    if (!created.post) {
      throw new NotFoundException('Social post not found');
    }

    if (post.authorUserId !== input.requesterUserId) {
      await this.socialRepository.createNotification({
        userId: post.authorUserId,
        notificationType: 'SOCIAL_POST_COMMENT',
        title: 'Binh luan moi',
        body: 'Bai viet cua ban vua co binh luan moi.',
        targetType: 'SOCIAL_POST',
        targetId: post.id,
        dedupeKey: `SOCIAL_POST_COMMENT:${created.commentId}:${post.authorUserId}`,
      });
    }

    return toSocialPostResponse(created.post, input.requesterUserId);
  }
}
