import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { LiveController } from './live.controller';

describe('LiveController Agora routes', () => {
  it('exposes Agora access routes without recording refresh', () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    expect(Reflect.getMetadata(PATH_METADATA, LiveController)).toBe('/');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        LiveController.prototype.joinLiveSession,
      ),
    ).toBe('live/sessions/:sessionId/join');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        LiveController.prototype.getBroadcastCredentials,
      ),
    ).toBe('live/sessions/:sessionId/broadcast-credentials');
    expect('refreshLiveRecording' in LiveController.prototype).toBe(false);
    /* eslint-enable @typescript-eslint/unbound-method */
  });

  it('creates a server-owned session and returns publisher access at top level', async () => {
    const fixture = controllerFixture();
    fixture.catalog.createLiveSession.mockResolvedValue({
      id: 'live-1',
      shopId: 'shop-1',
      status: 'SCHEDULED',
      streamProvider: 'AGORA_RTC',
    });
    fixture.agora.issueToken.mockReturnValue({
      appId: 'app-id',
      channelName: 'live_channel',
      uid: 41,
      token: '007-publisher-token',
      role: 'PUBLISHER',
      expiresAt: '2026-07-29T03:00:00.000Z',
    });

    const result = await fixture.controller.createLiveSession(
      'seller-1',
      {
        shopId: 'shop-1',
        title: 'Live hang chinh hang',
        startAt: '2026-07-29T02:00:00.000Z',
        clientId: '8954d00d-dbf8-4dc4-a9b7-30b94d1df8ea',
      },
      {
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        mimetype: 'image/png',
        originalname: 'cover.png',
        size: 4,
      },
    );

    expect(fixture.agora.assertConfigured).toHaveBeenCalledTimes(1);
    expect(fixture.catalog.createLiveSession).toHaveBeenCalledWith({
      sessionId: expect.any(String) as string,
      requesterUserId: 'seller-1',
      shopId: 'shop-1',
      title: 'Live hang chinh hang',
      description: null,
      coverImage: {
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        mimetype: 'image/png',
        originalname: 'cover.png',
        size: 4,
      },
      startAt: '2026-07-29T02:00:00.000Z',
      offerIds: [],
      voucherIds: [],
    });
    expect(result).toMatchObject({
      streamProvider: 'AGORA_RTC',
      role: 'PUBLISHER',
      token: '007-publisher-token',
    });
    expect(fixture.agora.issueToken).toHaveBeenCalledWith({
      sessionId: expect.any(String) as string,
      clientId: '8954d00d-dbf8-4dc4-a9b7-30b94d1df8ea',
      principalId: 'seller-1',
      role: 'PUBLISHER',
    });
  });

  it('issues a subscriber token to an anonymous viewer without client-selected role', async () => {
    const fixture = controllerFixture();
    fixture.catalog.getLiveBroadcastContext.mockResolvedValue({
      sessionId: '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
      status: 'LIVE',
      streamProvider: 'AGORA_RTC',
      providerSessionId: 'live_3f40b6b432c441fea34453db0e2c9930',
      rtcRole: 'SUBSCRIBER',
    });
    fixture.agora.issueToken.mockReturnValue({
      appId: 'app-id',
      channelName: 'live_3f40b6b432c441fea34453db0e2c9930',
      uid: 42,
      token: '007-token',
      role: 'SUBSCRIBER',
      expiresAt: '2026-07-29T03:00:00.000Z',
    });

    await expect(
      fixture.controller.joinLiveSession(
        '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
        undefined,
        { clientId: '8954d00d-dbf8-4dc4-a9b7-30b94d1df8ea' },
      ),
    ).resolves.toMatchObject({ role: 'SUBSCRIBER', uid: 42 });
    expect(fixture.catalog.getLiveBroadcastContext).toHaveBeenCalledWith({
      sessionId: '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
      requesterUserId: null,
      accessRole: 'auto',
    });
    expect(fixture.agora.issueToken).toHaveBeenCalledWith({
      sessionId: '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
      clientId: '8954d00d-dbf8-4dc4-a9b7-30b94d1df8ea',
      principalId: null,
      role: 'SUBSCRIBER',
    });
  });

  it('honors an explicit subscriber request from the session owner', async () => {
    const fixture = controllerFixture();
    fixture.users.findById.mockResolvedValue({
      id: 'seller-1',
      accountStatus: 'active',
    });
    fixture.catalog.getLiveBroadcastContext.mockResolvedValue({
      streamProvider: 'AGORA_RTC',
      providerSessionId: 'live_3f40b6b432c441fea34453db0e2c9930',
      rtcRole: 'SUBSCRIBER',
    });
    fixture.agora.issueToken.mockReturnValue({ role: 'SUBSCRIBER' });

    await fixture.controller.joinLiveSession(
      '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
      { id: 'seller-1' } as never,
      {
        clientId: '8954d00d-dbf8-4dc4-a9b7-30b94d1df8ea',
        role: 'SUBSCRIBER',
      },
    );

    expect(fixture.catalog.getLiveBroadcastContext).toHaveBeenCalledWith(
      expect.objectContaining({ accessRole: 'subscriber' }),
    );
    expect(fixture.lease.claim).not.toHaveBeenCalled();
  });

  it('rejects a second publisher when the session lease is occupied', async () => {
    const fixture = controllerFixture();
    fixture.users.findById.mockResolvedValue({
      id: 'seller-1',
      accountStatus: 'active',
    });
    fixture.catalog.getLiveBroadcastContext.mockResolvedValue({
      streamProvider: 'AGORA_RTC',
      providerSessionId: 'live_3f40b6b432c441fea34453db0e2c9930',
      rtcRole: 'PUBLISHER',
    });
    fixture.lease.claim.mockResolvedValue(false);

    await expect(
      fixture.controller.joinLiveSession(
        '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
        { id: 'seller-1' } as never,
        {
          clientId: '8954d00d-dbf8-4dc4-a9b7-30b94d1df8ea',
          role: 'PUBLISHER',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(fixture.agora.issueToken).not.toHaveBeenCalled();
  });

  it('returns conflict when the publisher heartbeat loses its lease', async () => {
    const fixture = controllerFixture();
    fixture.lease.heartbeat.mockResolvedValue(false);

    await expect(
      fixture.controller.heartbeatPublisherLease('live-1', 'seller-1', {
        clientId: '8954d00d-dbf8-4dc4-a9b7-30b94d1df8ea',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('broadcasts a changed pinned offer and keeps the command response lean', async () => {
    const fixture = controllerFixture();
    fixture.catalog.updatePinnedLiveOffer.mockResolvedValue({
      changed: true,
      session: {
        id: 'live-1',
        shopId: 'shop-1',
        pinnedOfferId: 'offer-1',
        pinnedOffer: {
          id: 'offer-1',
          title: 'Offer 1',
          availableQuantity: 3,
        },
      },
    });

    await expect(
      fixture.controller.updatePinnedLiveOffer(
        'live-1',
        'seller-1',
        { role: 'seller' } as never,
        { offerId: 'offer-1' },
      ),
    ).resolves.toEqual({
      success: true,
      message: expect.any(String) as string,
    });
    expect(fixture.realtime.broadcastPinnedOffer).toHaveBeenCalledWith({
      sessionId: 'live-1',
      pinnedOfferId: 'offer-1',
      pinnedOffer: {
        id: 'offer-1',
        title: 'Offer 1',
        availableQuantity: 3,
      },
    });
  });

  it('does not rebroadcast an idempotent pinned offer command', async () => {
    const fixture = controllerFixture();
    fixture.catalog.updatePinnedLiveOffer.mockResolvedValue({
      changed: false,
      session: {
        id: 'live-1',
        shopId: 'shop-1',
        pinnedOfferId: null,
      },
    });

    await fixture.controller.updatePinnedLiveOffer(
      'live-1',
      'seller-1',
      { role: 'seller' } as never,
      { offerId: null },
    );

    expect(fixture.realtime.broadcastPinnedOffer).not.toHaveBeenCalled();
  });

  it('rejects an inactive authenticated requester before issuing access', async () => {
    const fixture = controllerFixture();
    fixture.users.findById.mockResolvedValue({
      id: 'seller-1',
      accountStatus: 'inactive',
    });

    await expect(
      fixture.controller.joinLiveSession(
        '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
        { id: 'seller-1' } as never,
        { clientId: '8954d00d-dbf8-4dc4-a9b7-30b94d1df8ea' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(fixture.catalog.getLiveBroadcastContext).not.toHaveBeenCalled();
    expect(fixture.agora.issueToken).not.toHaveBeenCalled();
  });

  it('keeps the deprecated credentials alias owner-only', async () => {
    const fixture = controllerFixture();
    fixture.catalog.getLiveBroadcastContext.mockResolvedValue({
      status: 'SCHEDULED',
      streamProvider: 'AGORA_RTC',
      providerSessionId: 'live_3f40b6b432c441fea34453db0e2c9930',
      rtcRole: 'PUBLISHER',
    });
    fixture.agora.issueToken.mockReturnValue({ role: 'PUBLISHER' });

    await expect(
      fixture.controller.getBroadcastCredentials(
        '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
        { id: 'seller-1' } as never,
        { clientId: '8954d00d-dbf8-4dc4-a9b7-30b94d1df8ea' },
      ),
    ).resolves.toMatchObject({ role: 'PUBLISHER' });
    expect(fixture.catalog.getLiveBroadcastContext).toHaveBeenCalledWith({
      sessionId: '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
      requesterUserId: 'seller-1',
      accessRole: 'owner',
    });
  });

  it('rejects a session whose persisted channel does not match its ID', async () => {
    const fixture = controllerFixture();
    fixture.catalog.getLiveBroadcastContext.mockResolvedValue({
      status: 'LIVE',
      streamProvider: 'AGORA_RTC',
      providerSessionId: 'other-channel',
      rtcRole: 'SUBSCRIBER',
    });

    await expect(
      fixture.controller.joinLiveSession(
        '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
        undefined,
        { clientId: '8954d00d-dbf8-4dc4-a9b7-30b94d1df8ea' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fixture.agora.issueToken).not.toHaveBeenCalled();
  });

  it('notifies reminders after publish and strips internal transition fields', async () => {
    const fixture = controllerFixture();
    fixture.catalog.startLiveSession.mockResolvedValue({
      id: 'live-1',
      shopId: 'shop-1',
      title: 'Live hang chinh hang',
      status: 'LIVE',
      startedNow: true,
      reminderUserIds: ['buyer-1'],
    });
    fixture.users.createNotification.mockResolvedValue({
      id: 'notification-1',
    });

    const result = await fixture.controller.startLiveSession(
      'live-1',
      'seller-1',
    );

    expect(result).toEqual({
      id: 'live-1',
      shopId: 'shop-1',
      title: 'Live hang chinh hang',
      status: 'LIVE',
    });
    expect(fixture.users.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'buyer-1',
        dedupeKey: 'live-started:live-1:buyer-1',
      }),
    );
    expect(fixture.notification.notifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'buyer-1' }),
    );
  });

  it('does not regress a live transition when notification delivery fails', async () => {
    const fixture = controllerFixture();
    fixture.catalog.startLiveSession.mockResolvedValue({
      id: 'live-1',
      title: 'Live hang chinh hang',
      status: 'LIVE',
      startedNow: true,
      reminderUserIds: ['buyer-1'],
    });
    fixture.users.createNotification.mockRejectedValue(
      new Error('users service unavailable'),
    );

    await expect(
      fixture.controller.startLiveSession('live-1', 'seller-1'),
    ).rejects.toThrow('Live-start notifications are pending retry');
    expect(fixture.notification.notifyUser).not.toHaveBeenCalled();
  });

  it('does not rebroadcast an existing deduplicated live-start notification', async () => {
    const fixture = controllerFixture();
    fixture.catalog.startLiveSession.mockResolvedValue({
      id: 'live-1',
      title: 'Live hang chinh hang',
      status: 'LIVE',
      startedNow: false,
      reminderUserIds: ['buyer-1'],
    });
    fixture.users.createNotification.mockResolvedValue({
      id: 'notification-1',
      createdNow: false,
    });

    await expect(
      fixture.controller.startLiveSession('live-1', 'seller-1'),
    ).resolves.toMatchObject({ id: 'live-1', status: 'LIVE' });
    expect(fixture.notification.notifyUser).not.toHaveBeenCalled();
  });
});

function controllerFixture() {
  const catalog = {
    createLiveSession: jest.fn(),
    getLiveBroadcastContext: jest.fn(),
    startLiveSession: jest.fn(),
    updatePinnedLiveOffer: jest.fn(),
    updateLiveSessionOffers: jest.fn(),
  };
  const dashboard = { notifyShop: jest.fn() };
  const realtime = { broadcastPinnedOffer: jest.fn() };
  const lease = {
    claim: jest.fn().mockResolvedValue(true),
    heartbeat: jest.fn().mockResolvedValue(true),
    release: jest.fn().mockResolvedValue(true),
    forceRelease: jest.fn().mockResolvedValue(undefined),
  };
  const agora = {
    assertConfigured: jest.fn(),
    issueToken: jest.fn(),
  };
  const users = {
    createNotification: jest.fn(),
    findById: jest.fn(),
  };
  const notification = { notifyUser: jest.fn() };
  return {
    catalog,
    dashboard,
    realtime,
    lease,
    agora,
    users,
    notification,
    controller: new LiveController(
      catalog as never,
      {} as never,
      {} as never,
      realtime as never,
      lease as never,
      dashboard as never,
      agora as never,
      users as never,
      notification as never,
    ),
  };
}
