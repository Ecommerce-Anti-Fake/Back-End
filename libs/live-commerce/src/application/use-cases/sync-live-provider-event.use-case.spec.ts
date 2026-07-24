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
      providerEventAt: null,
      providerEventType: null,
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
      providerEventAt: new Date('2026-07-25T02:00:00.000Z'),
      providerEventType: 'live_input.connected',
      providerErrorCode: null,
      providerErrorMessage: null,
    });
    expect(repository.listLiveReminderUserIds).toHaveBeenCalledWith('live-1');
  });

  it('does not notify reminders again when an active input reconnects', async () => {
    repository.findLiveSessionByProviderId.mockResolvedValueOnce({
      id: 'live-1',
      status: 'LIVE',
      actualStartedAt: new Date('2026-07-25T02:00:00.000Z'),
      providerEventAt: new Date('2026-07-25T02:00:00.000Z'),
      providerEventType: 'live_input.connected',
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
      providerEventAt: new Date('2026-07-25T03:00:00.000Z'),
      providerEventType: 'live_input.disconnected',
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
      recordingUrl: 'https://customer-code.cloudflarestream.com/video-1/iframe',
    });

    expect(repository.updateLiveProviderState).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'live-1',
        status: 'ENDED',
        providerEventAt: new Date('2026-07-25T03:01:00.000Z'),
        providerEventType: 'recording.ready',
        providerErrorCode: null,
        providerErrorMessage: null,
        recordingUrl:
          'https://customer-code.cloudflarestream.com/video-1/iframe',
      }),
    );
  });

  it('records provider errors without ending commerce', async () => {
    repository.findLiveSessionByProviderId.mockResolvedValueOnce({
      id: 'live-1',
      status: 'LIVE',
      providerEventAt: new Date('2026-07-25T02:00:00.000Z'),
      providerEventType: 'live_input.connected',
    });
    const useCase = new SyncLiveProviderEventUseCase(repository as never);

    await useCase.execute({
      providerSessionId: 'input-1',
      eventType: 'live_input.errored',
      occurredAt: '2026-07-25T02:01:00.000Z',
      errorCode: 'ERR_GOP_OUT_OF_RANGE',
      errorMessage: 'Input GOP is invalid',
    });

    expect(repository.updateLiveProviderState).toHaveBeenCalledWith({
      sessionId: 'live-1',
      status: undefined,
      providerStatus: 'ERROR',
      actualStartedAt: undefined,
      actualEndedAt: undefined,
      providerEventAt: new Date('2026-07-25T02:01:00.000Z'),
      providerEventType: 'live_input.errored',
      providerErrorCode: 'ERR_GOP_OUT_OF_RANGE',
      providerErrorMessage: 'Input GOP is invalid',
    });
  });

  it('ignores duplicate provider events', async () => {
    repository.findLiveSessionByProviderId.mockResolvedValueOnce({
      id: 'live-1',
      status: 'LIVE',
      actualStartedAt: new Date('2026-07-25T02:00:00.000Z'),
      providerEventAt: new Date('2026-07-25T02:00:00.000Z'),
      providerEventType: 'live_input.connected',
    });
    const useCase = new SyncLiveProviderEventUseCase(repository as never);

    const result = await useCase.execute({
      providerSessionId: 'input-1',
      eventType: 'live_input.connected',
      occurredAt: '2026-07-25T02:00:00.000Z',
    });

    expect(repository.updateLiveProviderState).not.toHaveBeenCalled();
    expect(repository.listLiveReminderUserIds).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({ id: 'live-1', reminderUserIds: [] }),
    );
  });

  it('ignores provider events older than the last stored event', async () => {
    repository.findLiveSessionByProviderId.mockResolvedValueOnce({
      id: 'live-1',
      status: 'LIVE',
      providerEventAt: new Date('2026-07-25T02:05:00.000Z'),
      providerEventType: 'live_input.connected',
    });
    const useCase = new SyncLiveProviderEventUseCase(repository as never);

    await useCase.execute({
      providerSessionId: 'input-1',
      eventType: 'live_input.disconnected',
      occurredAt: '2026-07-25T02:04:00.000Z',
    });

    expect(repository.updateLiveProviderState).not.toHaveBeenCalled();
  });

  it('does not move a terminal commerce session back to live', async () => {
    repository.findLiveSessionByProviderId.mockResolvedValueOnce({
      id: 'live-1',
      status: 'ENDED',
      providerEventAt: null,
      providerEventType: null,
    });
    const useCase = new SyncLiveProviderEventUseCase(repository as never);

    await useCase.execute({
      providerSessionId: 'input-1',
      eventType: 'live_input.connected',
      occurredAt: '2026-07-25T04:00:00.000Z',
    });

    expect(repository.updateLiveProviderState).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'live-1',
        status: undefined,
        providerStatus: 'CONNECTED',
      }),
    );
    expect(repository.listLiveReminderUserIds).not.toHaveBeenCalled();
  });

  it('accepts an event for an unknown provider input without retrying forever', async () => {
    repository.findLiveSessionByProviderId.mockResolvedValueOnce(null);
    const useCase = new SyncLiveProviderEventUseCase(repository as never);

    await expect(
      useCase.execute({
        providerSessionId: 'missing-input',
        eventType: 'live_input.disconnected',
        occurredAt: '2026-07-25T04:00:00.000Z',
      }),
    ).resolves.toEqual({
      matched: false,
      providerSessionId: 'missing-input',
    });
    expect(repository.updateLiveProviderState).not.toHaveBeenCalled();
  });
});
