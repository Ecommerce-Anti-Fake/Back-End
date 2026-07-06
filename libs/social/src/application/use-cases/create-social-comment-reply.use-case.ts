import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SocialRepository } from '../../infrastructure/persistence/social.repository';
import { toSocialCommentReplyResponse } from '../social.mapper';

@Injectable()
export class CreateSocialCommentReplyUseCase {
  constructor(private readonly socialRepository: SocialRepository) {}

  async execute(input: {
    commentId: string;
    requesterUserId: string;
    body: string;
  }) {
    const body = input.body.trim();
    if (!body) {
      throw new BadRequestException('Comment body is required');
    }

    const parentComment = await this.socialRepository.findSocialCommentById(
      input.commentId,
      input.requesterUserId,
    );
    if (!parentComment || parentComment.visibility !== 'PUBLIC') {
      throw new NotFoundException('Parent social comment not found');
    }

    const reply = await this.socialRepository.createSocialCommentReply({
      postId: parentComment.postId,
      parentCommentId: parentComment.id,
      authorUserId: input.requesterUserId,
      body,
    });
    if (parentComment.authorUserId !== input.requesterUserId) {
      await this.socialRepository.createNotification({
        userId: parentComment.authorUserId,
        notificationType: 'SOCIAL_COMMENT_REPLY',
        title: 'Phan hoi moi',
        body: 'Binh luan cua ban vua co phan hoi moi.',
        targetType: 'SOCIAL_COMMENT',
        targetId: parentComment.id,
        dedupeKey: `SOCIAL_COMMENT_REPLY:${reply.id}:${parentComment.authorUserId}`,
      });
    }
    return toSocialCommentReplyResponse(reply);
  }
}
