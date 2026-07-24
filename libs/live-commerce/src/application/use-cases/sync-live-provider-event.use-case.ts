import { Injectable, NotFoundException } from '@nestjs/common';
import { LiveCommerceRepository } from '../../infrastructure/persistence/live-commerce.repository';

type ProviderEventType =
  | 'live_input.connected'
  | 'live_input.disconnected'
  | 'recording.ready';

@Injectable()
export class SyncLiveProviderEventUseCase {
  constructor(
    private readonly liveCommerceRepository: LiveCommerceRepository,
  ) {}

  async execute(input: {
    providerSessionId: string;
    eventType: ProviderEventType;
    occurredAt: string;
    recordingUrl?: string | null;
  }) {
    const session =
      await this.liveCommerceRepository.findLiveSessionByProviderId(
        input.providerSessionId,
      );
    if (!session) {
      throw new NotFoundException('Live session not found');
    }
    const occurredAt = new Date(input.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new NotFoundException('Invalid provider event timestamp');
    }

    if (
      input.eventType === 'live_input.connected' &&
      !['ENDED', 'CANCELLED'].includes(session.status)
    ) {
      const shouldNotifyReminders = !session.actualStartedAt;
      const updated =
        await this.liveCommerceRepository.updateLiveProviderState({
          sessionId: session.id,
          status: 'LIVE',
          providerStatus: 'CONNECTED',
          actualStartedAt: shouldNotifyReminders ? occurredAt : undefined,
          actualEndedAt: undefined,
        });
      return {
        ...updated,
        reminderUserIds: shouldNotifyReminders
          ? await this.liveCommerceRepository.listLiveReminderUserIds(
              session.id,
            )
          : [],
      };
    }
    if (input.eventType === 'live_input.disconnected') {
      return this.liveCommerceRepository.updateLiveProviderState({
        sessionId: session.id,
        status: undefined,
        providerStatus: 'DISCONNECTED',
        actualStartedAt: undefined,
        actualEndedAt: undefined,
      });
    }
    if (
      input.eventType === 'recording.ready' &&
      ['LIVE', 'ENDED'].includes(session.status)
    ) {
      return this.liveCommerceRepository.updateLiveProviderState({
        sessionId: session.id,
        status: 'ENDED',
        providerStatus: 'IDLE',
        actualStartedAt: undefined,
        actualEndedAt: occurredAt,
        recordingUrl: input.recordingUrl?.trim() || undefined,
      });
    }

    return session;
  }
}
