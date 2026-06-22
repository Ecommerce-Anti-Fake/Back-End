import { Injectable } from '@nestjs/common';
import { SocialRepository } from '../../infrastructure/persistence/social.repository';
import { toSocialPostResponse } from '../social.mapper';

@Injectable()
export class ListSocialPostsUseCase {
  constructor(private readonly socialRepository: SocialRepository) {}

  async execute(
    input: {
      requesterUserId?: string | null;
      includeHidden?: boolean;
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    const posts = await this.socialRepository.listSocialPosts(input);
    return posts.map((post) =>
      toSocialPostResponse(post, input.requesterUserId),
    );
  }
}
