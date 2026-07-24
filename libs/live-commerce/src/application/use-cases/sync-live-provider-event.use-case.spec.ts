import { SyncLiveProviderEventUseCase } from './sync-live-provider-event.use-case';

describe('SyncLiveProviderEventUseCase', () => {
  const repository = {
    findLiveSessionByProviderId: jest.fn(),
    updateLiveProviderState: jest.fn(),
    listLiveReminderUserIds: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findLiveSessionByProviderId.mockResolvedValue({
      id: 'live-1',
      status: 'SCHEDULED',
    });
    repository.updateLiveProviderState.mockResolvedValue({ id: 'live-1' });
    repository.listLiveReminderUserIds.mockResolvedValue(['buyer-1']);
  });

  it('moves a scheduled session live when the RTMPS input connects', async () => {
    const useCase = new SyncLiveProviderEventUseCase(repository as never);

    await useCase.execute({
      providerSessionId: 'input-1',
      eventType: 'live_input.connected',
      occurredAt: '2026-07-25T02:00:00.000Z',
    });

    expect(repository.updateLiveProviderState).toHaveBeenCalledWith({
      sessionId: 'live-1',
      status: 'LIVE',
      providerStatus: 'CONNECTED',
      actualStartedAt: new Date('2026-07-25T02:00:00.000Z'),
      actualEndedAt: undefined,
    });
    expect(repository.listLiveReminderUserIds).toHaveBeenCalledWith('live-1');
  });

  it('does not notify reminders again when an active input reconnects', async () => {
    repository.findLiveSessionByProviderId.mockResolvedValueOnce({
      id: 'live-1',
      status: 'LIVE',
      actualStartedAt: new Date('2026-07-25T02:00:00.000Z'),
    });
    const useCase = new SyncLiveProviderEventUseCase(repository as never);

    const result = await useCase.execute({
      providerSessionId: 'input-1',
      eventType: 'live_input.connected',
      occurredAt: '2026-07-25T02:05:00.000Z',
    });

    expect(repository.updateLiveProviderState).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'live-1',
        actualStartedAt: undefined,
      }),
    );
    expect(repository.listLiveReminderUserIds).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ reminderUserIds: [] }));
  });

  it('marks provider disconnected without ending commerce immediately', async () => {
    repository.findLiveSessionByProviderId.mockResolvedValueOnce({
      id: 'live-1',
      status: 'LIVE',
    });
    const useCase = new SyncLiveProviderEventUseCase(repository as never);

    await useCase.execute({
      providerSessionId: 'input-1',
      eventType: 'live_input.disconnected',
      occurredAt: '2026-07-25T03:00:00.000Z',
    });

    expect(repository.updateLiveProviderState).toHaveBeenCalledWith({
      sessionId: 'live-1',
      status: undefined,
      providerStatus: 'DISCONNECTED',
      actualStartedAt: undefined,
      actualEndedAt: undefined,
    });
  });

  it('ends the session and stores the ready recording URL', async () => {
    repository.findLiveSessionByProviderId.mockResolvedValueOnce({
      id: 'live-1',
      status: 'LIVE',
    });
    const useCase = new SyncLiveProviderEventUseCase(repository as never);

    await useCase.execute({
      providerSessionId: 'input-1',
      eventType: 'recording.ready',
      occurredAt: '2026-07-25T03:01:00.000Z',
      recordingUrl:
        'https://customer-code.cloudflarestream.com/video-1/iframe',
    });

    expect(repository.updateLiveProviderState).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'live-1',
        status: 'ENDED',
        recordingUrl:
          'https://customer-code.cloudflarestream.com/video-1/iframe',
      }),
    );
  });
});
