import { Injectable, NotFoundException } from '@nestjs/common';
import { SocialRepository } from '../../infrastructure/persistence/social.repository';
import { toSocialCommentResponse } from '../social.mapper';

@Injectable()
export class SetSocialCommentLikeUseCase {
  constructor(private readonly socialRepository: SocialRepository) {}

  async execute(input: { commentId: string; requesterUserId: string }) {
    const comment = await this.socialRepository.findSocialCommentById(input.commentId, input.requesterUserId);
    if (!comment || comment.visibility !== 'PUBLIC') throw new NotFoundException('Social comment not found');

    const updatedComment = await this.socialRepository.setSocialCommentLike({
      commentId: input.commentId,
      userId: input.requesterUserId,
    });
    if (!updatedComment) throw new NotFoundException('Social comment not found');

    if (comment.authorUserId !== input.requesterUserId) {
      await this.socialRepository.createNotification({
        userId: comment.authorUserId,
        notificationType: 'SOCIAL_COMMENT_LIKE',
        title: 'Luot thich moi',
        body: 'Binh luan cua ban vua duoc thich.',
        targetType: 'SOCIAL_COMMENT',
        targetId: comment.id,
        dedupeKey: `SOCIAL_COMMENT_LIKE:${comment.id}:${input.requesterUserId}`,
      });
    }
    return toSocialCommentResponse(updatedComment);
  }
}

@Injectable()
export class RemoveSocialCommentLikeUseCase {
  constructor(private readonly socialRepository: SocialRepository) {}

  async execute(input: { commentId: string; requesterUserId: string }) {
    const comment = await this.socialRepository.findSocialCommentById(input.commentId, input.requesterUserId);
    if (!comment || comment.visibility !== 'PUBLIC') throw new NotFoundException('Social comment not found');

    const updatedComment = await this.socialRepository.removeSocialCommentLike({
      commentId: input.commentId,
      userId: input.requesterUserId,
    });
    if (!updatedComment || updatedComment.visibility !== 'PUBLIC') throw new NotFoundException('Social comment not found');
    return toSocialCommentResponse(updatedComment);
  }
}
