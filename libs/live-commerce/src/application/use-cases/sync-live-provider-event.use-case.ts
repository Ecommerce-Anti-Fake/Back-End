import { BadRequestException, Injectable } from '@nestjs/common';
import { LiveCommerceRepository } from '../../infrastructure/persistence/live-commerce.repository';

type ProviderEventType =
  | 'live_input.connected'
  | 'live_input.disconnected'
  | 'live_input.errored'
  | 'recording.ready';

const PROVIDER_EVENT_PRIORITY: Record<ProviderEventType, number> = {
  'live_input.connected': 1,
  'live_input.disconnected': 2,
  'live_input.errored': 3,
  'recording.ready': 4,
};

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
    errorCode?: string | null;
    errorMessage?: string | null;
    videoCodec?: string | null;
    audioCodec?: string | null;
  }) {
    const session =
      await this.liveCommerceRepository.findLiveSessionByProviderId(
        input.providerSessionId,
      );
    if (!session) {
      return {
        matched: false,
        providerSessionId: input.providerSessionId,
      };
    }
    const occurredAt = new Date(input.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('Invalid provider event timestamp');
    }
    if (isStaleOrDuplicateEvent(session, input.eventType, occurredAt)) {
      return input.eventType === 'live_input.connected'
        ? { ...session, reminderUserIds: [] }
        : session;
    }

    if (input.eventType === 'live_input.connected') {
      const isTerminal = ['ENDED', 'CANCELLED'].includes(session.status);
      const shouldNotifyReminders = !isTerminal && !session.actualStartedAt;
      const updated = await this.liveCommerceRepository.updateLiveProviderState(
        {
          sessionId: session.id,
          status: isTerminal ? undefined : 'LIVE',
          providerStatus: 'CONNECTED',
          actualStartedAt: shouldNotifyReminders ? occurredAt : undefined,
          actualEndedAt: undefined,
          providerEventAt: occurredAt,
          providerEventType: input.eventType,
          providerErrorCode: null,
          providerErrorMessage: null,
        },
      );
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
        providerEventAt: occurredAt,
        providerEventType: input.eventType,
      });
    }
    if (input.eventType === 'live_input.errored') {
      return this.liveCommerceRepository.updateLiveProviderState({
        sessionId: session.id,
        status: undefined,
        providerStatus: 'ERROR',
        actualStartedAt: undefined,
        actualEndedAt: undefined,
        providerEventAt: occurredAt,
        providerEventType: input.eventType,
        providerErrorCode: input.errorCode?.trim() || 'UNKNOWN',
        providerErrorMessage:
          input.errorMessage?.trim().slice(0, 512) || 'Unknown provider error',
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
        providerEventAt: occurredAt,
        providerEventType: input.eventType,
        providerErrorCode: null,
        providerErrorMessage: null,
        recordingUrl: input.recordingUrl?.trim() || undefined,
      });
    }

    return session;
  }
}

function isStaleOrDuplicateEvent(
  session: {
    providerEventAt?: Date | null;
    providerEventType?: string | null;
  },
  incomingType: ProviderEventType,
  incomingAt: Date,
) {
  if (!session.providerEventAt) return false;
  const storedAt = new Date(session.providerEventAt);
  if (storedAt.getTime() > incomingAt.getTime()) return true;
  if (storedAt.getTime() < incomingAt.getTime()) return false;
  const storedPriority =
    PROVIDER_EVENT_PRIORITY[session.providerEventType as ProviderEventType] ??
    0;
  return storedPriority >= PROVIDER_EVENT_PRIORITY[incomingType];
}
