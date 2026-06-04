import {
  REALTIME_EVENT_DEFINITIONS,
  RealtimeEventDispatcher,
  createRealtimeEvent,
  getRealtimeEventDefinition,
} from './realtime-event.dispatcher';

describe('realtime event foundation', () => {
  it('defines initial versioned event contracts with transport and recovery metadata', () => {
    expect(REALTIME_EVENT_DEFINITIONS.notificationOrderCreatedV1).toMatchObject({
      name: 'notification.order.created.v1',
      family: 'notification',
      classification: 'durable',
      transports: ['in_app', 'sse', 'fcm'],
      recoverable: true,
      replayable: true,
      auditRequired: true,
      recovery: { method: 'GET', path: '/users/notifications' },
    });
    expect(REALTIME_EVENT_DEFINITIONS.chatMessageCreatedV1).toMatchObject({
      name: 'chat.message.created.v1',
      family: 'chat',
      classification: 'durable',
      transports: ['websocket', 'sse'],
    });
    expect(REALTIME_EVENT_DEFINITIONS.liveReactionEphemeralV1).toMatchObject({
      name: 'live.reaction.ephemeral.v1',
      family: 'live',
      classification: 'ephemeral',
      transports: ['websocket'],
      droppable: true,
      sampled: true,
      aggregated: true,
      auditRequired: false,
    });
  });

  it('creates deterministic dedupe keys from declared payload fields', () => {
    const event = createRealtimeEvent({
      name: 'notification.order.created.v1',
      id: 'evt-1',
      occurredAt: new Date('2026-06-04T00:00:00.000Z'),
      payload: {
        notificationId: 'notification-1',
        orderId: 'order-1',
        recipientUserId: 'user-1',
      },
      audience: { scope: 'user', id: 'user-1' },
      source: {
        service: 'orders-service',
        resourceType: 'order',
        resourceId: 'order-1',
        writeCommitted: true,
      },
    });

    expect(event.dedupeKey).toBe('notification.order.created.v1:order-1:user-1');
  });

  it('rejects events with an authorization scope outside the contract', async () => {
    const dispatcher = new RealtimeEventDispatcher();
    const event = createRealtimeEvent({
      name: 'chat.message.created.v1',
      id: 'evt-2',
      occurredAt: new Date('2026-06-04T00:00:00.000Z'),
      payload: {
        messageId: 'message-1',
        threadId: 'thread-1',
        senderUserId: 'user-1',
      },
      audience: { scope: 'publicLiveSession', id: 'live-1' },
      source: {
        service: 'catalog-service',
        resourceType: 'chatMessage',
        resourceId: 'message-1',
        writeCommitted: true,
      },
    });

    await expect(dispatcher.dispatch(event)).rejects.toThrow('not allowed for event chat.message.created.v1');
  });

  it('requires durable events to be emitted only after a committed durable write', async () => {
    const dispatcher = new RealtimeEventDispatcher();
    const event = createRealtimeEvent({
      name: 'notification.order.created.v1',
      id: 'evt-3',
      occurredAt: new Date('2026-06-04T00:00:00.000Z'),
      payload: {
        notificationId: 'notification-1',
        orderId: 'order-1',
        recipientUserId: 'user-1',
      },
      audience: { scope: 'user', id: 'user-1' },
      source: {
        service: 'orders-service',
        resourceType: 'order',
        resourceId: 'order-1',
        writeCommitted: false,
      },
    });

    await expect(dispatcher.dispatch(event)).rejects.toThrow('after a committed durable write');
  });

  it('audits durable dispatches and sends only eligible transports', async () => {
    const dispatcher = new RealtimeEventDispatcher();
    const sent: string[] = [];
    const audits: string[] = [];
    dispatcher.registerTransportSink({
      transport: 'websocket',
      send: async () => sent.push('websocket'),
    });
    dispatcher.registerTransportSink({
      transport: 'sse',
      send: async () => sent.push('sse'),
    });
    dispatcher.registerAuditSink({
      record: async (entry) => audits.push(entry.eventName),
    });

    const event = createRealtimeEvent({
      name: 'chat.message.created.v1',
      id: 'evt-4',
      occurredAt: new Date('2026-06-04T00:00:00.000Z'),
      payload: {
        messageId: 'message-1',
        threadId: 'thread-1',
        senderUserId: 'user-1',
      },
      audience: { scope: 'user', id: 'user-2' },
      source: {
        service: 'catalog-service',
        resourceType: 'chatMessage',
        resourceId: 'message-1',
        writeCommitted: true,
      },
    });

    const result = await dispatcher.dispatch(event);

    expect(sent).toEqual(['websocket', 'sse']);
    expect(audits).toEqual(['chat.message.created.v1']);
    expect(result.auditEntry).toMatchObject({
      eventName: 'chat.message.created.v1',
      dedupeKey: 'chat.message.created.v1:thread-1:message-1',
    });
  });

  it('keeps lookup keyed by public event name', () => {
    expect(getRealtimeEventDefinition('live.reaction.ephemeral.v1')).toBe(
      REALTIME_EVENT_DEFINITIONS.liveReactionEphemeralV1,
    );
  });
});
