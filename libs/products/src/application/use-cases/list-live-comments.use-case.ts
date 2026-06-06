import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toLiveCommentResponse } from './products.mapper';

@Injectable()
export class ListLiveCommentsUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: {
    sessionId: string;
    requesterUserId?: string | null;
    requesterRole?: string | null;
    cursor?: string | null;
    since?: string | null;
    pageSize?: number | null;
    includeHidden?: boolean | null;
  }) {
    const session = await this.productRepository.findLiveSessionById(input.sessionId, input.requesterUserId);
    if (!session || session.status === 'CANCELLED') {
      throw new NotFoundException('Live session not found');
    }

    const since = input.since ? new Date(input.since) : null;
    if (since && Number.isNaN(since.getTime())) {
      throw new BadRequestException('since is invalid');
    }

    const includeHidden = input.requesterRole === 'admin' && Boolean(input.includeHidden);
    const comments = await this.productRepository.listLiveComments({
      sessionId: input.sessionId,
      cursor: input.cursor ?? null,
      since,
      pageSize: input.pageSize ?? null,
      includeHidden,
    });

    return comments.map(toLiveCommentResponse);
  }
}
