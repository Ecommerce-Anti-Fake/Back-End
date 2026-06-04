import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { REALTIME_OPERATION_METRICS, RedisRealtimeConfigService, createSocketIoRedisAdapter } from '@common';
import type { AccessTokenPayload } from '@contracts';
import { Server, Socket } from 'socket.io';
import { ProductsRpcService } from './products-rpc.service';

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
    private readonly productsRpcService: ProductsRpcService,
    private readonly redisRealtimeConfigService: RedisRealtimeConfigService,
  ) {}

  async bind(httpServer: unknown) {
    if (this.io) {
      return;
    }

    const io = new Server(httpServer as never, {
      cors: {
        origin: true,
        credentials: true,
      },
    });
    this.io = io;

    await this.attachRedisAdapter(io);

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
      const thread = await this.productsRpcService.getChatThread({
        threadId,
        requesterUserId: principal.userId,
        requesterRole: principal.role,
      });
      await socket.join(this.roomName(threadId));
      this.logger.log({
        metric: 'realtime.websocket.room_join',
        userId: principal.userId,
        room: this.roomName(threadId),
      });
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
      const thread = await this.productsRpcService.sendChatMessage({
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

    socket.on('chat:join', (payload: ChatJoinPayload, ack?: ChatAckCallback) => {
      void this.joinThread(socket, principal, payload ?? {}, ack);
    });

    socket.on('chat:send', (payload: ChatSendPayload, ack?: ChatAckCallback) => {
      void this.sendMessage(socket, principal, payload ?? {}, ack);
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
