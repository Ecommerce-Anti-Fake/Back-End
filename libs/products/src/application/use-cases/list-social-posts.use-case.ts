import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toSocialPostResponse } from './products.mapper';

@Injectable()
export class ListSocialPostsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: { requesterUserId?: string | null; includeHidden?: boolean; page?: number; pageSize?: number } = {}) {
    const posts = await this.productRepository.listSocialPosts(input);
    return posts.map((post) => toSocialPostResponse(post, input.requesterUserId));
  }
}
