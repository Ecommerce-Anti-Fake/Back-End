import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LiveCommerceRepository } from '../../infrastructure/persistence/live-commerce.repository';
import { toLiveCommentResponse } from '../live-commerce.mapper';

@Injectable()
export class DeleteLiveCommentUseCase {
  constructor(
    private readonly liveCommerceRepository: LiveCommerceRepository,
  ) {}

  async execute(input: {
    sessionId: string;
    commentId: string;
    requesterUserId: string;
    requesterRole?: string | null;
  }) {
    if (input.requesterRole !== 'admin') {
      throw new ForbiddenException('Only admin can moderate live comments');
    }

    const session = await this.liveCommerceRepository.findLiveSessionById(
      input.sessionId,
      input.requesterUserId,
    );
    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    const comment = await this.liveCommerceRepository.deleteLiveComment(input);
    return toLiveCommentResponse(comment);
  }
}
