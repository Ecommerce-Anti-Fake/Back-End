import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toChatThreadListItemResponse } from './products.mapper';

@Injectable()
export class ListChatThreadsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: { requesterUserId: string; requesterRole?: string | null }) {
    const threads = await this.productRepository.findChatThreadsForUser(input);

    return threads.map((thread) => toChatThreadListItemResponse(thread, input.requesterUserId));
  }
}