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
    parentCommentId?: string | null;
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

    const parentCommentId = input.parentCommentId ?? null;
    if (parentCommentId) {
      const parentComment = await this.socialRepository.findSocialCommentById(
        parentCommentId,
        input.requesterUserId,
      );
      if (!parentComment || parentComment.visibility !== 'PUBLIC') {
        throw new NotFoundException('Parent social comment not found');
      }
      if (parentComment.postId !== input.postId) {
        throw new BadRequestException('Parent comment belongs to another post');
      }
    }

    const updatedPost = await this.socialRepository.createSocialComment({
      postId: input.postId,
      parentCommentId,
      authorUserId: input.requesterUserId,
      body,
    });
    if (!updatedPost) {
      throw new NotFoundException('Social post not found');
    }

    return toSocialPostResponse(updatedPost, input.requesterUserId);
  }
}
