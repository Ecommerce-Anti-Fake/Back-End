import { Injectable, NotFoundException } from '@nestjs/common';
import { SocialRepository } from '../../infrastructure/persistence/social.repository';
import { toSocialCommentResponse } from '../social.mapper';

@Injectable()
export class ListSocialCommentsUseCase {
  constructor(private readonly socialRepository: SocialRepository) {}

  async execute(input: {
    postId: string;
    requesterUserId?: string | null;
    requesterRole?: string | null;
    page?: number;
    pageSize?: number;
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

    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 10));
    const [totalItems, comments] = await Promise.all([
      this.socialRepository.countSocialComments(input.postId),
      this.socialRepository.listSocialComments({
        postId: input.postId,
        page,
        pageSize,
      }),
    ]);

    return {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
      items: comments.map(toSocialCommentResponse),
    };
  }
}
