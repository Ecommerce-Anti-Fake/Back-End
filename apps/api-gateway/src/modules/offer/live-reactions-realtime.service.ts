import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  LIVE_REACTION_TYPES,
  LiveReactionType,
  PRESENCE_HEARTBEAT_INTERVAL_MS,
  REALTIME_OPERATION_METRICS,
  RealtimeLiveReactionService,
  RealtimePresenceService,
} from '@common';
import type { AccessTokenPayload } from '@contracts';
import { Server, Socket } from 'socket.io';
import { CatalogRpcService } from './catalog-rpc.service';

type LiveSocketPrincipal = {
  userId: string;
  role: string;
};

type LiveJoinPayload = {
  liveSessionId?: string;
};

type LiveReactionPayload = {
  liveSessionId?: string;
  reactionType?: string;
};

type LiveCommentPayload = {
  liveSessionId?: string;
  body?: string;
  clientMessageId?: string | null;
};

type LiveSessionRecord = {
  id?: string;
  status?: string;
};

type LiveAck =
  | { ok: true; aggregate?: unknown; comment?: unknown; clientMessageId?: string | null }
  | { ok: false; error: string; aggregate?: unknown };

type LiveAckCallback = (ack: LiveAck) => void;

@Injectable()
export class LiveReactionsRealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(LiveReactionsRealtimeService.name);
  private io: Server | null = null;
  private readonly commentRateLimits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly catalogRpcService: CatalogRpcService,
    private readonly liveReactionService: RealtimeLiveReactionService,
    private readonly presenceService: RealtimePresenceService,
  ) {}

  bind(io: Server) {
    if (this.io) {
      return;
    }

    this.io = io;
    io.on('connection', (socket) => {
      void this.handleConnection(socket);
    });
  }

  async onModuleDestroy() {
    this.io = null;
  }

  roomName(liveSessionId: string) {
    return `live:session:${liveSessionId}`;
  }

  async authenticate(socket: Socket): Promise<LiveSocketPrincipal> {
    const rawToken = socket.handshake.auth?.accessToken || socket.handshake.query?.accessToken;
    const accessToken = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    if (!accessToken || typeof accessToken !== 'string') {
      throw new Error('Missing access token');
    }

    const payload = await this.jwtService.verifyAsync<AccessTokenPayload & { type?: string }>(accessToken);
    const tokenType = payload.typ ?? payload.type;
    if (!payload.sub || !payload.role || tokenType !== 'access') {
      throw new Error('Invalid access token');
    }

    return {
      userId: payload.sub,
      role: payload.role,
    };
  }

  async joinLiveSession(socket: Socket, principal: LiveSocketPrincipal, payload: LiveJoinPayload, ack?: LiveAckCallback) {
    const liveSessionId = payload.liveSessionId?.trim();
    if (!liveSessionId) {
      this.ackError(ack, 'liveSessionId is required');
      return;
    }

    try {
      await this.assertCanJoin(liveSessionId, principal);
      await socket.join(this.roomName(liveSessionId));
      this.joinedLiveSessions(socket).add(liveSessionId);
      await this.presenceService.addLiveViewer({ liveSessionId, userId: principal.userId, sessionId: socket.id });
      const aggregate = await this.liveReactionService.getAggregate(liveSessionId);
      socket.emit('live:reaction.aggregate', aggregate);
      ack?.({ ok: true, aggregate });
    } catch (error) {
      this.logger.warn({
        metric: 'realtime.websocket.live_join_failed',
        userId: principal.userId,
        liveSessionId,
        message: error instanceof Error ? error.message : 'join failed',
      });
      this.ackError(ack, error instanceof Error ? error.message : 'Cannot join live session');
    }
  }

  async sendReaction(socket: Socket, principal: LiveSocketPrincipal, payload: LiveReactionPayload, ack?: LiveAckCallback) {
    const liveSessionId = payload.liveSessionId?.trim();
    const reactionType = normalizeReactionType(payload.reactionType);
    if (!liveSessionId || !reactionType) {
      this.ackError(ack, 'liveSessionId and reactionType are required');
      return;
    }
    if (!this.joinedLiveSessions(socket).has(liveSessionId)) {
      this.ackError(ack, 'Join the live session before sending reactions');
      return;
    }

    const result = await this.liveReactionService.recordReaction({
      liveSessionId,
      userId: principal.userId,
      reactionType,
    });
    if (!result.accepted) {
      ack?.({ ok: false, error: result.reason ?? 'reaction_dropped', aggregate: result.aggregate });
      return;
    }

    const event = {
      eventName: 'live.reaction.created.v1',
      liveSessionId,
      reactionType,
      aggregate: result.aggregate,
      actor: { userId: publicUserId(principal.userId) },
    };
    this.io?.to(this.roomName(liveSessionId)).emit('live:reaction.created', event);
    ack?.({ ok: true, aggregate: result.aggregate });
  }

  async sendComment(socket: Socket, principal: LiveSocketPrincipal, payload: LiveCommentPayload, ack?: LiveAckCallback) {
    const liveSessionId = payload.liveSessionId?.trim();
    const body = payload.body?.trim();
    const clientMessageId = payload.clientMessageId?.trim() || null;
    if (!liveSessionId || !body) {
      this.ackError(ack, 'liveSessionId and body are required');
      return;
    }
    if (!this.joinedLiveSessions(socket).has(liveSessionId)) {
      this.ackError(ack, 'Join the live session before sending comments');
      return;
    }
    if (!this.acceptComment(principal.userId, liveSessionId)) {
      this.ackError(ack, 'live_comment_rate_limited');
      return;
    }

    try {
      const comment = await this.catalogRpcService.createLiveComment({
        sessionId: liveSessionId,
        requesterUserId: principal.userId,
        requesterRole: principal.role,
        body,
        clientMessageId,
      });
      const event = {
        eventName: 'live.comment.created.v1',
        liveSessionId,
        comment,
        clientMessageId,
      };
      this.io?.to(this.roomName(liveSessionId)).emit('live:comment.created', event);
      ack?.({ ok: true, comment, clientMessageId });
    } catch (error) {
      this.ackError(ack, error instanceof Error ? error.message : 'Cannot send live comment');
    }
  }

  private async handleConnection(socket: Socket) {
    let principal: LiveSocketPrincipal;
    try {
      principal = await this.authenticate(socket);
    } catch {
      socket.emit('live:error', { error: 'Unauthorized' });
      return;
    }

    socket.on('live:join', (payload: LiveJoinPayload, ack?: LiveAckCallback) => {
      void this.joinLiveSession(socket, principal, payload ?? {}, ack);
    });
    socket.on('live:reaction', (payload: LiveReactionPayload, ack?: LiveAckCallback) => {
      void this.sendReaction(socket, principal, payload ?? {}, ack);
    });
    socket.on('live:comment', (payload: LiveCommentPayload, ack?: LiveAckCallback) => {
      void this.sendComment(socket, principal, payload ?? {}, ack);
    });
    socket.on('presence:heartbeat', (ack?: (payload: { ok: true }) => void) => {
      void this.recordHeartbeat(socket, principal).then(() => ack?.({ ok: true }));
    });
  }

  private async recordHeartbeat(socket: Socket, principal: LiveSocketPrincipal) {
    for (const liveSessionId of this.joinedLiveSessions(socket)) {
      await this.presenceService.refreshLiveViewer({ liveSessionId, userId: principal.userId, sessionId: socket.id });
    }
    this.logger.log({
      metric: REALTIME_OPERATION_METRICS.websocketPresenceHeartbeats,
      userId: principal.userId,
      intervalMs: PRESENCE_HEARTBEAT_INTERVAL_MS,
    });
  }

  private async assertCanJoin(liveSessionId: string, principal: LiveSocketPrincipal) {
    const sessions = await this.catalogRpcService.listLiveSessions({
      requesterUserId: principal.userId,
      filter: 'all',
      q: null,
    });
    const items = normalizeList<LiveSessionRecord>(sessions, ['items', 'data', 'sessions']);
    const session = items.find((item) => item.id === liveSessionId);
    if (!session || session.status === 'CANCELLED') {
      throw new Error('Live session is not available');
    }
  }

  private joinedLiveSessions(socket: Socket) {
    if (!socket.data.joinedLiveSessions) {
      socket.data.joinedLiveSessions = new Set<string>();
    }
    return socket.data.joinedLiveSessions as Set<string>;
  }

  private ackError(ack: LiveAckCallback | undefined, error: string) {
    ack?.({ ok: false, error });
  }

  private acceptComment(userId: string, liveSessionId: string) {
    const key = `${userId}:${liveSessionId}`;
    const now = Date.now();
    const current = this.commentRateLimits.get(key);
    if (!current || current.resetAt <= now) {
      this.commentRateLimits.set(key, { count: 1, resetAt: now + 10_000 });
      return true;
    }
    if (current.count >= 6) {
      return false;
    }
    current.count += 1;
    return true;
  }
}

function normalizeReactionType(value: string | undefined): LiveReactionType | null {
  const normalized = value?.trim().toUpperCase();
  return LIVE_REACTION_TYPES.includes(normalized as LiveReactionType) ? (normalized as LiveReactionType) : null;
}

function publicUserId(userId: string) {
  return userId.length <= 8 ? userId : `${userId.slice(0, 8)}...`;
}

function normalizeList<T>(data: unknown, keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    for (const key of keys) {
      const value = (data as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}
