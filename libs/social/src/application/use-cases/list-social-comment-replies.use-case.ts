import { Injectable, NotFoundException } from '@nestjs/common';
import { SocialRepository } from '../../infrastructure/persistence/social.repository';
import { toSocialCommentReplyResponse } from '../social.mapper';

@Injectable()
export class ListSocialCommentRepliesUseCase {
  constructor(private readonly socialRepository: SocialRepository) {}

  async execute(input: {
    commentId: string;
    requesterUserId?: string | null;
    requesterRole?: string | null;
    page?: number;
    pageSize?: number;
  }) {
    const comment = await this.socialRepository.findSocialCommentById(
      input.commentId,
      input.requesterUserId,
    );
    if (
      !comment ||
      comment.visibility !== 'PUBLIC' ||
      (comment.post.visibility !== 'PUBLIC' &&
        comment.post.authorUserId !== input.requesterUserId &&
        input.requesterRole !== 'admin')
    ) {
      throw new NotFoundException('Social comment not found');
    }

    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 5));
    const [totalItems, replies] = await Promise.all([
      this.socialRepository.countSocialCommentReplies(input.commentId),
      this.socialRepository.listSocialCommentReplies({
        commentId: input.commentId,
        page,
        pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
      items: replies.map(toSocialCommentReplyResponse),
    };
  }
}
