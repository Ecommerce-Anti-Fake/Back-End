import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  PRESENCE_HEARTBEAT_INTERVAL_MS,
  REALTIME_OPERATION_METRICS,
  RealtimePresenceService,
  RedisRealtimeConfigService,
  createSocketIoRedisAdapter,
} from '@common';
import type { AccessTokenPayload } from '@contracts';
import { Server, Socket } from 'socket.io';
import { CatalogRpcService } from '../offer/catalog-rpc.service';
import { LiveReactionsRealtimeService } from './live-reactions-realtime.service';

type ChatSocketPrincipal = {
  userId: string;
  role: string;
};

type ChatJoinPayload = {
  threadId?: string;
};

type ChatSendPayload = {
  threadId?: string;
  body?: string;
  clientMessageId?: string | null;
};

type ChatTypingPayload = {
  threadId?: string;
  isTyping?: boolean;
};

type ChatThreadRecord = {
  id?: string;
  buyerUserId?: string;
  sellerUserId?: string;
};

type ChatAck =
  | { ok: true; thread?: unknown; clientMessageId?: string | null }
  | { ok: false; error: string };

type ChatAckCallback = (ack: ChatAck) => void;

@Injectable()
export class ChatRealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(ChatRealtimeService.name);
  private io: Server | null = null;
  private adapterClose: (() => Promise<void>) | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly catalogRpcService: CatalogRpcService,
    private readonly redisRealtimeConfigService: RedisRealtimeConfigService,
    private readonly presenceService: RealtimePresenceService,
    private readonly liveReactionsRealtimeService: LiveReactionsRealtimeService,
  ) {}

  async bind(httpServer: unknown) {
    if (this.io) {
      return;
    }

    const io = new Server(httpServer as never, {
    path: '/api/socket.io',
    cors: {
      origin: true,
      credentials: true,
    },
  });
    this.io = io;

    await this.attachRedisAdapter(io);
    this.liveReactionsRealtimeService.bind(io);

    io.on('connection', (socket) => {
      void this.handleConnection(socket);
    });
  }

  async onModuleDestroy() {
    await this.adapterClose?.();
    this.io?.close();
    this.io = null;
  }

  roomName(threadId: string) {
    return `chat:thread:${threadId}`;
  }

  async authenticate(socket: Socket): Promise<ChatSocketPrincipal> {
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

  async joinThread(socket: Socket, principal: ChatSocketPrincipal, payload: ChatJoinPayload, ack?: ChatAckCallback) {
    const threadId = payload.threadId?.trim();
    if (!threadId) {
      this.ackError(ack, 'threadId is required');
      return;
    }

    try {
      const thread = (await this.catalogRpcService.getChatThread({
        threadId,
        requesterUserId: principal.userId,
        requesterRole: principal.role,
      })) as ChatThreadRecord;
      await socket.join(this.roomName(threadId));
      this.joinedThreads(socket).add(threadId);
      this.logger.log({
        metric: 'realtime.websocket.room_join',
        userId: principal.userId,
        room: this.roomName(threadId),
      });
      await this.emitThreadPresence(threadId, thread);
      ack?.({ ok: true, thread });
    } catch (error) {
      this.logger.warn({
        metric: 'realtime.websocket.room_join_failed',
        userId: principal.userId,
        threadId,
        message: error instanceof Error ? error.message : 'join failed',
      });
      this.ackError(ack, error instanceof Error ? error.message : 'Cannot join chat thread');
    }
  }

  async sendMessage(socket: Socket, principal: ChatSocketPrincipal, payload: ChatSendPayload, ack?: ChatAckCallback) {
    const threadId = payload.threadId?.trim();
    const body = payload.body?.trim();
    const clientMessageId = payload.clientMessageId?.trim() || null;
    if (!threadId || !body) {
      this.ackError(ack, 'threadId and body are required');
      return;
    }

    try {
      const thread = await this.catalogRpcService.sendChatMessage({
        threadId,
        requesterUserId: principal.userId,
        requesterRole: principal.role,
        body,
        clientMessageId,
        messageType: 'TEXT',
      });
      const event = {
        eventName: 'chat.message.created.v1',
        threadId,
        thread,
        clientMessageId,
      };
      this.io?.to(this.roomName(threadId)).emit('chat:message.created', event);
      ack?.({ ok: true, thread, clientMessageId });
    } catch (error) {
      this.logger.warn({
        metric: 'realtime.websocket.send_failed',
        userId: principal.userId,
        threadId,
        message: error instanceof Error ? error.message : 'send failed',
      });
      this.ackError(ack, error instanceof Error ? error.message : 'Cannot send chat message');
    }
  }

  async markTyping(socket: Socket, principal: ChatSocketPrincipal, payload: ChatTypingPayload) {
    const threadId = payload.threadId?.trim();
    if (!threadId || !this.joinedThreads(socket).has(threadId)) {
      socket.emit('chat:error', { error: 'Join the chat thread before sending typing events' });
      return;
    }

    await this.presenceService.markTyping({
      scope: this.roomName(threadId),
      userId: principal.userId,
      isTyping: Boolean(payload.isTyping),
    });
    socket.to(this.roomName(threadId)).emit('chat:typing', {
      threadId,
      userId: principal.userId,
      isTyping: Boolean(payload.isTyping),
    });
    this.logger.log({
      metric: REALTIME_OPERATION_METRICS.websocketTypingEvents,
      userId: principal.userId,
      threadId,
      isTyping: Boolean(payload.isTyping),
    });
  }

  private async handleConnection(socket: Socket) {
    let principal: ChatSocketPrincipal;
    try {
      principal = await this.authenticate(socket);
      socket.data.principal = principal;
    } catch {
      this.logger.warn({
        metric: REALTIME_OPERATION_METRICS.websocketConnectionErrors,
      });
      socket.emit('chat:error', { error: 'Unauthorized' });
      socket.disconnect(true);
      return;
    }

    this.logger.log({
      metric: REALTIME_OPERATION_METRICS.websocketConnections,
      userId: principal.userId,
      connected: true,
    });
    await this.recordHeartbeat(socket, principal);

    socket.on('chat:join', (payload: ChatJoinPayload, ack?: ChatAckCallback) => {
      void this.joinThread(socket, principal, payload ?? {}, ack);
    });

    socket.on('chat:send', (payload: ChatSendPayload, ack?: ChatAckCallback) => {
      void this.sendMessage(socket, principal, payload ?? {}, ack);
    });

    socket.on('presence:heartbeat', (ack?: (payload: { ok: true }) => void) => {
      void this.recordHeartbeat(socket, principal).then(() => ack?.({ ok: true }));
    });

    socket.on('chat:typing', (payload: ChatTypingPayload) => {
      void this.markTyping(socket, principal, payload ?? {});
    });

    socket.on('disconnect', (reason) => {
      this.logger.log({
        metric: REALTIME_OPERATION_METRICS.websocketConnections,
        userId: principal.userId,
        connected: false,
        reason,
      });
    });
  }

  private async recordHeartbeat(socket: Socket, principal: ChatSocketPrincipal) {
    await this.presenceService.heartbeat({
      userId: principal.userId,
      sessionId: socket.id,
      metadata: {
        transport: socket.conn.transport.name,
      },
    });
    this.logger.log({
      metric: REALTIME_OPERATION_METRICS.websocketPresenceHeartbeats,
      userId: principal.userId,
      sessionId: socket.id,
      intervalMs: PRESENCE_HEARTBEAT_INTERVAL_MS,
    });
    await this.emitPresenceToJoinedThreads(socket, principal.userId);
  }

  private async emitThreadPresence(threadId: string, thread: ChatThreadRecord) {
    const userIds = [thread.buyerUserId, thread.sellerUserId].filter((value): value is string => Boolean(value));
    const onlineUserIds = await this.presenceService.listOnlineUserIds(userIds);
    this.io?.to(this.roomName(threadId)).emit('presence:update', {
      threadId,
      onlineUserIds,
    });
  }

  private async emitPresenceToJoinedThreads(socket: Socket, userId: string) {
    for (const threadId of this.joinedThreads(socket)) {
      this.io?.to(this.roomName(threadId)).emit('presence:update', {
        threadId,
        userId,
        online: true,
      });
    }
  }

  private joinedThreads(socket: Socket) {
    if (!socket.data.joinedChatThreads) {
      socket.data.joinedChatThreads = new Set<string>();
    }
    return socket.data.joinedChatThreads as Set<string>;
  }

  private async attachRedisAdapter(io: Server) {
    const config = this.redisRealtimeConfigService.getConfig();
    try {
      const adapterHandle = await createSocketIoRedisAdapter(config);
      if (!adapterHandle) {
        this.logger.log('Socket.IO Redis adapter disabled; using local in-process chat rooms');
        return;
      }

      io.adapter(adapterHandle.adapter);
      this.adapterClose = adapterHandle.close;
      this.logger.log(`Socket.IO Redis adapter enabled in ${config.mode} mode`);
    } catch (error) {
      this.logger.warn(
        `Socket.IO Redis adapter unavailable; using local in-process chat rooms: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private ackError(ack: ChatAckCallback | undefined, error: string) {
    ack?.({ ok: false, error });
  }
}
