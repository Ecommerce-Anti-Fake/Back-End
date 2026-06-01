import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toLiveSessionResponse } from './products.mapper';

@Injectable()
export class ListLiveSessionsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: { requesterUserId?: string | null; filter?: 'all' | 'live' | 'upcoming'; q?: string | null }) {
    const sessions = await this.productRepository.listLiveSessions(input);
    return sessions.map((session) => toLiveSessionResponse(session, input.requesterUserId));
  }
}
