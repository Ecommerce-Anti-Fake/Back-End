import { Injectable } from '@nestjs/common';

export type RealtimeEventFamily = 'notification' | 'chat' | 'live' | 'dashboard' | 'moderation' | 'system';
export type RealtimeEventClassification = 'durable' | 'ephemeral';
export type RealtimeEventTransport = 'in_app' | 'sse' | 'websocket' | 'fcm' | 'internal';
export type RealtimeAudienceScope = 'user' | 'shop' | 'admin' | 'publicLiveSession';

export type RealtimeAudience = {
  scope: RealtimeAudienceScope;
  id: string;
};

export type RealtimeEventSource = {
  service: string;
  resourceType: string;
  resourceId: string;
  writeCommitted: boolean;
};

export type RealtimeEventDefinition = {
  name: string;
  family: RealtimeEventFamily;
  version: 1;
  classification: RealtimeEventClassification;
  payloadShape: Record<string, 'string' | 'number' | 'boolean' | 'object'>;
  requiredPayloadFields: string[];
  allowedAudienceScopes: RealtimeAudienceScope[];
  dedupeKeyFields: string[];
  persistence: 'postgres' | 'redis_or_transport';
  recovery: { method: 'GET'; path: string } | null;
  transports: RealtimeEventTransport[];
  replayable: boolean;
  recoverable: boolean;
  droppable: boolean;
  sampled: boolean;
  aggregated: boolean;
  auditRequired: boolean;
  rateLimit: {
    subject: string;
    windowSeconds: number;
    maxEvents: number;
  };
};

export type RealtimeEventName =
  | 'notification.order.created.v1'
  | 'chat.message.created.v1'
  | 'live.reaction.ephemeral.v1';

export type RealtimeEvent = {
  id: string;
  name: RealtimeEventName;
  occurredAt: Date;
  payload: Record<string, unknown>;
  audience: RealtimeAudience;
  source: RealtimeEventSource;
  dedupeKey: string;
};

export type RealtimeEventInput = Omit<RealtimeEvent, 'dedupeKey'> & {
  dedupeKey?: string;
};

export type RealtimeEventAuditEntry = {
  eventId: string;
  eventName: RealtimeEventName;
  dedupeKey: string;
  audience: RealtimeAudience;
  source: RealtimeEventSource;
  occurredAt: Date;
  auditedAt: Date;
};

export type RealtimeEventTransportSink = {
  transport: RealtimeEventTransport;
  send: (event: RealtimeEvent, definition: RealtimeEventDefinition) => Promise<void>;
};

export type RealtimeEventAuditSink = {
  record: (entry: RealtimeEventAuditEntry) => Promise<void>;
};

export type RealtimeEventDispatchResult = {
  event: RealtimeEvent;
  definition: RealtimeEventDefinition;
  deliveredTransports: RealtimeEventTransport[];
  auditEntry: RealtimeEventAuditEntry | null;
};

export const REALTIME_EVENT_DEFINITIONS = {
  notificationOrderCreatedV1: {
    name: 'notification.order.created.v1',
    family: 'notification',
    version: 1,
    classification: 'durable',
    payloadShape: {
      notificationId: 'string',
      orderId: 'string',
      recipientUserId: 'string',
    },
    requiredPayloadFields: ['notificationId', 'orderId', 'recipientUserId'],
    allowedAudienceScopes: ['user'],
    dedupeKeyFields: ['orderId', 'recipientUserId'],
    persistence: 'postgres',
    recovery: { method: 'GET', path: '/users/notifications' },
    transports: ['in_app', 'sse', 'fcm'],
    replayable: true,
    recoverable: true,
    droppable: false,
    sampled: false,
    aggregated: false,
    auditRequired: true,
    rateLimit: {
      subject: 'user',
      windowSeconds: 60,
      maxEvents: 120,
    },
  },
  chatMessageCreatedV1: {
    name: 'chat.message.created.v1',
    family: 'chat',
    version: 1,
    classification: 'durable',
    payloadShape: {
      messageId: 'string',
      threadId: 'string',
      senderUserId: 'string',
    },
    requiredPayloadFields: ['messageId', 'threadId', 'senderUserId'],
    allowedAudienceScopes: ['user', 'shop'],
    dedupeKeyFields: ['threadId', 'messageId'],
    persistence: 'postgres',
    recovery: { method: 'GET', path: '/products/chat/threads/:threadId' },
    transports: ['websocket', 'sse'],
    replayable: true,
    recoverable: true,
    droppable: false,
    sampled: false,
    aggregated: false,
    auditRequired: true,
    rateLimit: {
      subject: 'user',
      windowSeconds: 60,
      maxEvents: 60,
    },
  },
  liveReactionEphemeralV1: {
    name: 'live.reaction.ephemeral.v1',
    family: 'live',
    version: 1,
    classification: 'ephemeral',
    payloadShape: {
      liveSessionId: 'string',
      reactionType: 'string',
      actorUserId: 'string',
    },
    requiredPayloadFields: ['liveSessionId', 'reactionType'],
    allowedAudienceScopes: ['publicLiveSession'],
    dedupeKeyFields: [],
    persistence: 'redis_or_transport',
    recovery: null,
    transports: ['websocket'],
    replayable: false,
    recoverable: false,
    droppable: true,
    sampled: true,
    aggregated: true,
    auditRequired: false,
    rateLimit: {
      subject: 'user',
      windowSeconds: 10,
      maxEvents: 30,
    },
  },
} as const satisfies Record<string, RealtimeEventDefinition>;

const DEFINITIONS_BY_NAME = Object.values(REALTIME_EVENT_DEFINITIONS).reduce(
  (definitions, definition) => ({
    ...definitions,
    [definition.name]: definition,
  }),
  {} as Record<RealtimeEventName, RealtimeEventDefinition>,
);

export function getRealtimeEventDefinition(name: RealtimeEventName) {
  return DEFINITIONS_BY_NAME[name];
}

export function createRealtimeEvent(input: RealtimeEventInput): RealtimeEvent {
  const definition = getRealtimeEventDefinition(input.name);
  assertDefinition(definition, input.name);
  assertRequiredPayload(definition, input.payload);

  return {
    ...input,
    dedupeKey: input.dedupeKey ?? buildDedupeKey(definition, input.payload, input.id),
  };
}

@Injectable()
export class RealtimeEventDispatcher {
  private readonly transportSinks: RealtimeEventTransportSink[] = [];
  private readonly auditSinks: RealtimeEventAuditSink[] = [];

  registerTransportSink(sink: RealtimeEventTransportSink) {
    this.transportSinks.push(sink);
  }

  registerAuditSink(sink: RealtimeEventAuditSink) {
    this.auditSinks.push(sink);
  }

  async dispatch(event: RealtimeEvent): Promise<RealtimeEventDispatchResult> {
    const definition = getRealtimeEventDefinition(event.name);
    assertDefinition(definition, event.name);
    assertRequiredPayload(definition, event.payload);
    assertAudienceAllowed(definition, event);
    assertDurableWriteCommitted(definition, event);

    const auditEntry = definition.auditRequired ? buildAuditEntry(event) : null;
    if (auditEntry) {
      await Promise.all(this.auditSinks.map((sink) => sink.record(auditEntry)));
    }

    const eligibleSinks = this.transportSinks.filter((sink) => definition.transports.includes(sink.transport));
    await Promise.all(eligibleSinks.map((sink) => sink.send(event, definition)));

    return {
      event,
      definition,
      deliveredTransports: eligibleSinks.map((sink) => sink.transport),
      auditEntry,
    };
  }
}

function assertDefinition(definition: RealtimeEventDefinition | undefined, name: string): asserts definition {
  if (!definition) {
    throw new Error(`Unknown realtime event ${name}`);
  }
}

function assertRequiredPayload(definition: RealtimeEventDefinition, payload: Record<string, unknown>) {
  const missingFields = definition.requiredPayloadFields.filter((field) => payload[field] === undefined || payload[field] === null);

  if (missingFields.length > 0) {
    throw new Error(`Realtime event ${definition.name} is missing payload fields: ${missingFields.join(', ')}`);
  }
}

function assertAudienceAllowed(definition: RealtimeEventDefinition, event: RealtimeEvent) {
  if (!definition.allowedAudienceScopes.includes(event.audience.scope)) {
    throw new Error(`Audience scope ${event.audience.scope} is not allowed for event ${definition.name}`);
  }
}

function assertDurableWriteCommitted(definition: RealtimeEventDefinition, event: RealtimeEvent) {
  if (definition.classification === 'durable' && !event.source.writeCommitted) {
    throw new Error(`Durable event ${definition.name} must be emitted after a committed durable write`);
  }
}

function buildDedupeKey(definition: RealtimeEventDefinition, payload: Record<string, unknown>, fallbackId: string) {
  if (definition.dedupeKeyFields.length === 0) {
    return `${definition.name}:${fallbackId}`;
  }

  const parts = definition.dedupeKeyFields.map((field) => String(payload[field]));

  return [definition.name, ...parts].join(':');
}

function buildAuditEntry(event: RealtimeEvent): RealtimeEventAuditEntry {
  return {
    eventId: event.id,
    eventName: event.name,
    dedupeKey: event.dedupeKey,
    audience: event.audience,
    source: event.source,
    occurredAt: event.occurredAt,
    auditedAt: new Date(),
  };
}
