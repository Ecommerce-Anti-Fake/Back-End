import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LiveCommerceRepository } from '../../infrastructure/persistence/live-commerce.repository';
import { toLiveCommentResponse } from '../live-commerce.mapper';

@Injectable()
export class UpdateLiveCommentVisibilityUseCase {
  constructor(
    private readonly liveCommerceRepository: LiveCommerceRepository,
  ) {}

  async execute(input: {
    sessionId: string;
    commentId: string;
    requesterUserId: string;
    requesterRole?: string | null;
    visibility: 'PUBLIC' | 'HIDDEN';
  }) {
    const session = await this.liveCommerceRepository.findLiveSessionById(
      input.sessionId,
      input.requesterUserId,
    );
    if (!session) {
      throw new NotFoundException('Live session not found');
    }
    if (
      input.requesterRole !== 'admin' &&
      session.shop.ownerUserId !== input.requesterUserId
    ) {
      throw new ForbiddenException(
        'Only admin or session shop owner can moderate live comments',
      );
    }

    const comment =
      await this.liveCommerceRepository.updateLiveCommentVisibility(input);
    return toLiveCommentResponse(comment);
  }
}
