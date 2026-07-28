import {
  Injectable,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { RtcRole, RtcTokenBuilder } from 'agora-token';
import { agoraChannelName } from '@live-commerce';

export type AgoraRtcRole = 'PUBLISHER' | 'SUBSCRIBER';

const DEFAULT_TOKEN_TTL_SECONDS = 3600;
const MIN_TOKEN_TTL_SECONDS = 60;
const MAX_TOKEN_TTL_SECONDS = 86400;

@Injectable()
export class AgoraRtcTokenService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.startupConfiguration();
  }

  assertConfigured() {
    this.credentials();
  }

  issueToken(input: {
    sessionId: string;
    clientId: string;
    principalId?: string | null;
    role: AgoraRtcRole;
  }) {
    const { appId, appCertificate } = this.credentials();
    const ttlSeconds = this.tokenTtlSeconds();
    const channelName = agoraChannelName(input.sessionId);
    const uid = this.stableUid({
      appCertificate,
      channelName,
      clientId: input.clientId,
      principalId: input.principalId ?? 'anonymous',
      role: input.role,
    });
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      input.role === 'PUBLISHER' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
      ttlSeconds,
      ttlSeconds,
    );

    return {
      appId,
      channelName,
      uid,
      token,
      role: input.role,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    };
  }

  private credentials() {
    const appId = this.read('AGORA_APP_ID');
    const appCertificate = this.read('AGORA_APP_CERTIFICATE');
    if (!appId || !appCertificate) {
      throw new ServiceUnavailableException('Agora RTC is not configured');
    }
    this.validateCredentials(appId, appCertificate);
    return { appId, appCertificate };
  }

  private startupConfiguration() {
    const appId = this.read('AGORA_APP_ID');
    const appCertificate = this.read('AGORA_APP_CERTIFICATE');
    if (!appId || !appCertificate) {
      throw new Error('AGORA_APP_ID and AGORA_APP_CERTIFICATE are required');
    }
    this.validateCredentials(appId, appCertificate);
    this.tokenTtlSeconds();
  }

  private validateCredentials(appId: string, appCertificate: string) {
    if (
      !/^[a-fA-F0-9]{32}$/.test(appId) ||
      !/^[a-fA-F0-9]{32}$/.test(appCertificate)
    ) {
      throw new Error(
        'Agora RTC credentials must be 32 hexadecimal characters',
      );
    }
  }

  private tokenTtlSeconds() {
    const raw = this.read('AGORA_RTC_TOKEN_TTL_SECONDS');
    if (!raw) {
      throw new Error(
        `AGORA_RTC_TOKEN_TTL_SECONDS is required (use ${DEFAULT_TOKEN_TTL_SECONDS})`,
      );
    }
    const value = Number(raw);
    if (
      !Number.isInteger(value) ||
      value < MIN_TOKEN_TTL_SECONDS ||
      value > MAX_TOKEN_TTL_SECONDS
    ) {
      throw new Error(
        `AGORA_RTC_TOKEN_TTL_SECONDS must be between ${MIN_TOKEN_TTL_SECONDS} and ${MAX_TOKEN_TTL_SECONDS}`,
      );
    }
    return value;
  }

  private stableUid(input: {
    appCertificate: string;
    channelName: string;
    clientId: string;
    principalId: string;
    role: AgoraRtcRole;
  }) {
    const digest = createHmac('sha256', input.appCertificate)
      .update(`${input.channelName}:${input.principalId}:${input.clientId}`)
      .digest();
    return digest.readUInt32BE(0) || 1;
  }

  private read(key: string) {
    return this.configService.get<string>(key)?.trim() ?? '';
  }
}

export { agoraChannelName };
