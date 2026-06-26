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
    return toSocialCommentReplyResponse(reply);
  }
}
