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

    const updatedPost = await this.socialRepository.createSocialComment({
      postId: input.postId,
      authorUserId: input.requesterUserId,
      body,
    });
    if (!updatedPost) {
      throw new NotFoundException('Social post not found');
    }

    return toSocialPostResponse(updatedPost, input.requesterUserId);
  }
}
