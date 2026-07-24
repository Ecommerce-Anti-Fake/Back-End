import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LiveCommerceRepository } from '../../infrastructure/persistence/live-commerce.repository';
import { toLiveCommentResponse } from '../live-commerce.mapper';

@Injectable()
export class ListLiveCommentsUseCase {
  constructor(
    private readonly liveCommerceRepository: LiveCommerceRepository,
  ) {}

  async execute(input: {
    sessionId: string;
    requesterUserId?: string | null;
    requesterRole?: string | null;
    cursor?: string | null;
    since?: string | null;
    pageSize?: number | null;
    includeHidden?: boolean | null;
  }) {
    const session = await this.liveCommerceRepository.findLiveSessionById(
      input.sessionId,
      input.requesterUserId,
    );
    if (!session || session.status === 'CANCELLED') {
      throw new NotFoundException('Live session not found');
    }

    const since = input.since ? new Date(input.since) : null;
    if (since && Number.isNaN(since.getTime())) {
      throw new BadRequestException('since is invalid');
    }

    const canModerate =
      input.requesterRole === 'admin' ||
      (Boolean(input.requesterUserId) &&
        session.shop.ownerUserId === input.requesterUserId);
    const includeHidden = canModerate && Boolean(input.includeHidden);
    const comments = await this.liveCommerceRepository.listLiveComments({
      sessionId: input.sessionId,
      cursor: input.cursor ?? null,
      since,
      pageSize: input.pageSize ?? null,
      includeHidden,
    });

    return comments.map(toLiveCommentResponse);
  }
}
