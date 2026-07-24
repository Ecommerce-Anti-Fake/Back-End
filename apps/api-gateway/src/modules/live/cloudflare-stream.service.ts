import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

type CloudflareLiveInput = {
  uid: string;
  enabled: boolean;
  status: string | null;
  rtmps: {
    url: string;
    streamKey: string;
  };
};

export type BroadcastCredentials = {
  providerSessionId: string;
  playbackUrl: string;
  ingestUrl: string;
  streamKey: string;
  recordingRetentionDays: number;
  enabled: boolean;
  providerStatus: string | null;
};

@Injectable()
export class CloudflareStreamService implements OnModuleInit {
  private readonly logger = new Logger(CloudflareStreamService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const configuration = [
      this.accountId(),
      this.apiToken(),
      this.customerCode(),
      this.webhookSecret(),
    ];
    const configuredCount = configuration.filter(Boolean).length;
    const isProduction =
      this.configService.get<string>('NODE_ENV')?.trim() === 'production';
    if (
      (configuredCount > 0 && configuredCount < configuration.length) ||
      (isProduction && configuredCount !== configuration.length)
    ) {
      throw new Error('Cloudflare Stream configuration is incomplete');
    }
    if (configuredCount === configuration.length) {
      this.logger.log({
        metric: 'livestream.cloudflare.configured',
        accountFingerprint: fingerprint(this.accountId()),
        customerCodeFingerprint: fingerprint(this.customerCode()),
      });
    }
  }

  isConfigured() {
    return Boolean(
      this.accountId() &&
      this.apiToken() &&
      this.customerCode() &&
      this.webhookSecret(),
    );
  }

  async createLiveInput(input: {
    sessionName: string;
    sessionId: string;
    shopId: string;
  }): Promise<BroadcastCredentials> {
    this.assertConfigured();
    const retentionDays = this.retentionDays();
    this.logger.log({
      metric: 'livestream.cloudflare.create.start',
      accountFingerprint: fingerprint(this.accountId()),
    });
    const liveInput = await this.requestLiveInput(
      '',
      {
        method: 'POST',
        body: JSON.stringify({
          enabled: true,
          meta: {
            name: input.sessionName,
            sessionId: input.sessionId,
            shopId: input.shopId,
          },
          deleteRecordingAfterDays: retentionDays,
          recording: {
            mode: 'automatic',
            requireSignedURLs: false,
            allowedOrigins: this.allowedOrigins(),
            hideLiveViewerCount: false,
            timeoutSeconds: 60,
          },
          preferLowLatency: true,
        }),
      },
      'create',
    );
    if (!liveInput.enabled) {
      this.logger.error({
        metric: 'livestream.cloudflare.create.disabled',
        providerSessionId: liveInput.uid,
        accountFingerprint: fingerprint(this.accountId()),
      });
      throw new ServiceUnavailableException(
        'Livestream provider returned a disabled input',
      );
    }
    this.logger.log({
      metric: 'livestream.cloudflare.create.success',
      providerSessionId: liveInput.uid,
      enabled: liveInput.enabled,
      providerStatus: liveInput.status,
      accountFingerprint: fingerprint(this.accountId()),
    });

    return this.toCredentials(liveInput, retentionDays);
  }

  async getBroadcastCredentials(
    providerSessionId: string,
  ): Promise<BroadcastCredentials> {
    this.assertConfigured();
    const liveInput = await this.requestLiveInput(
      `/${encodeURIComponent(providerSessionId)}`,
      { method: 'GET' },
      'get_credentials',
    );
    if (!liveInput.enabled) {
      this.logger.error({
        metric: 'livestream.cloudflare.credentials.disabled',
        providerSessionId,
        providerStatus: liveInput.status,
      });
      throw new ServiceUnavailableException(
        'Livestream provider input is disabled',
      );
    }
    return this.toCredentials(liveInput, this.retentionDays());
  }

  async disableLiveInput(providerSessionId: string) {
    this.assertConfigured();
    const liveInput = await this.requestLiveInput(
      `/${encodeURIComponent(providerSessionId)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ enabled: false }),
      },
      'disable',
    );
    if (liveInput.enabled) {
      this.logger.error({
        metric: 'livestream.cloudflare.disable.rejected',
        providerSessionId,
        providerStatus: liveInput.status,
      });
      throw new ServiceUnavailableException(
        'Livestream provider did not disable the input',
      );
    }
    this.logger.log({
      metric: 'livestream.cloudflare.disable.success',
      providerSessionId,
      enabled: liveInput.enabled,
    });
  }

  async deleteLiveInput(providerSessionId: string) {
    this.assertConfigured();
    await this.requestCloudflare(
      `/${encodeURIComponent(providerSessionId)}`,
      { method: 'DELETE' },
      'delete',
      providerSessionId,
    );
    this.logger.log({
      metric: 'livestream.cloudflare.delete.success',
      providerSessionId,
    });
  }

  async getLatestReadyRecording(providerSessionId: string) {
    this.assertConfigured();
    const payload = await this.requestCloudflare(
      `/${encodeURIComponent(providerSessionId)}/videos`,
      {
        method: 'GET',
      },
      'list_recordings',
      providerSessionId,
    );
    const video = latestReadyVideo(payload);
    if (!video) return null;
    return {
      videoId: video.uid,
      recordingUrl: `https://customer-${this.customerCode()}.cloudflarestream.com/${video.uid}/iframe`,
    };
  }

  private async requestLiveInput(
    suffix: string,
    init: RequestInit,
    operation: string,
  ): Promise<CloudflareLiveInput> {
    const payload = await this.requestCloudflare(suffix, init, operation);
    const result = liveInputFromResponse(payload);
    if (!result) {
      this.logger.error({
        metric: 'livestream.cloudflare.response.invalid',
        operation,
        accountFingerprint: fingerprint(this.accountId()),
      });
      throw new ServiceUnavailableException(
        'Livestream provider returned an invalid response',
      );
    }
    return result;
  }

  private async requestCloudflare(
    suffix: string,
    init: RequestInit,
    operation: string,
    providerSessionId?: string,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId()}/stream/live_inputs${suffix}`,
        {
          ...init,
          headers: {
            Authorization: `Bearer ${this.apiToken()}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch (error) {
      this.logger.error({
        metric: 'livestream.cloudflare.request.failed',
        operation,
        providerSessionId,
        accountFingerprint: fingerprint(this.accountId()),
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      throw new ServiceUnavailableException(
        'Livestream provider is temporarily unavailable',
      );
    }
    const payload = (await response.json().catch(() => null)) as unknown;
    const envelopeSuccess = cloudflareEnvelopeSuccess(payload);
    if (!response.ok || envelopeSuccess === false) {
      const providerError = cloudflareErrorFromResponse(payload);
      this.logger.error({
        metric: 'livestream.cloudflare.request.rejected',
        operation,
        providerSessionId,
        accountFingerprint: fingerprint(this.accountId()),
        httpStatus: response.status,
        cfRay: response.headers.get('cf-ray') ?? undefined,
        providerErrorCode: providerError?.code,
        providerErrorMessage: providerError?.message,
      });
      throw new ServiceUnavailableException(
        'Livestream provider is temporarily unavailable',
      );
    }
    return payload;
  }

  private toCredentials(
    liveInput: CloudflareLiveInput,
    recordingRetentionDays: number,
  ): BroadcastCredentials {
    return {
      providerSessionId: liveInput.uid,
      playbackUrl: `https://customer-${this.customerCode()}.cloudflarestream.com/${liveInput.uid}/iframe`,
      ingestUrl: liveInput.rtmps.url,
      streamKey: liveInput.rtmps.streamKey,
      recordingRetentionDays,
      enabled: liveInput.enabled,
      providerStatus: liveInput.status,
    };
  }

  private allowedOrigins() {
    return (
      this.configService
        .get<string>('CLOUDFLARE_STREAM_ALLOWED_ORIGINS')
        ?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean) ?? []
    );
  }

  private retentionDays() {
    const configured = Number(
      this.configService.get<string>('LIVE_RECORDING_RETENTION_DAYS') ?? 30,
    );
    return Number.isInteger(configured) && configured >= 30 ? configured : 30;
  }

  private accountId() {
    return (
      this.configService.get<string>('CLOUDFLARE_STREAM_ACCOUNT_ID')?.trim() ??
      ''
    );
  }

  private apiToken() {
    return (
      this.configService.get<string>('CLOUDFLARE_STREAM_API_TOKEN')?.trim() ??
      ''
    );
  }

  private customerCode() {
    return (
      this.configService
        .get<string>('CLOUDFLARE_STREAM_CUSTOMER_CODE')
        ?.trim() ?? ''
    );
  }

  private webhookSecret() {
    return (
      this.configService
        .get<string>('CLOUDFLARE_STREAM_LIVE_WEBHOOK_SECRET')
        ?.trim() ?? ''
    );
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Livestream provider is not configured',
      );
    }
  }
}

function liveInputFromResponse(payload: unknown): CloudflareLiveInput | null {
  if (!payload || typeof payload !== 'object') return null;
  const envelope = payload as Record<string, unknown>;
  if (envelope.success !== true) return null;
  const result = envelope.result;
  if (!result || typeof result !== 'object') return null;
  const record = result as Record<string, unknown>;
  const rtmps = record.rtmps;
  if (!rtmps || typeof rtmps !== 'object') return null;
  const rtmpsRecord = rtmps as Record<string, unknown>;
  if (
    typeof record.uid !== 'string' ||
    typeof record.enabled !== 'boolean' ||
    !(
      record.status === null ||
      record.status === undefined ||
      typeof record.status === 'string'
    ) ||
    typeof rtmpsRecord.url !== 'string' ||
    typeof rtmpsRecord.streamKey !== 'string'
  ) {
    return null;
  }
  return {
    uid: record.uid,
    enabled: record.enabled,
    status: typeof record.status === 'string' ? record.status : null,
    rtmps: {
      url: rtmpsRecord.url,
      streamKey: rtmpsRecord.streamKey,
    },
  };
}

function cloudflareEnvelopeSuccess(payload: unknown): boolean | null {
  if (!payload || typeof payload !== 'object') return null;
  const success = (payload as Record<string, unknown>).success;
  return typeof success === 'boolean' ? success : null;
}

function cloudflareErrorFromResponse(
  payload: unknown,
): { code?: string; message?: string } | null {
  if (!payload || typeof payload !== 'object') return null;
  const errors = (payload as Record<string, unknown>).errors;
  if (!Array.isArray(errors) || errors.length === 0) return null;
  const first: unknown = errors[0];
  if (!first || typeof first !== 'object') return null;
  const record = first as Record<string, unknown>;
  return {
    code:
      typeof record.code === 'number' || typeof record.code === 'string'
        ? String(record.code).slice(0, 64)
        : undefined,
    message:
      typeof record.message === 'string'
        ? sanitizeProviderMessage(record.message)
        : undefined,
  };
}

function sanitizeProviderMessage(value: string) {
  return value
    .replace(/\p{Cc}+/gu, ' ')
    .replace(
      /\b(stream[\s_-]*key|api[\s_-]*token|authorization|token|secret)\b(\s*(?:[:=]|is)?\s*)[^\s,;]+/gi,
      '$1$2[REDACTED]',
    )
    .trim()
    .slice(0, 512);
}

function fingerprint(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function latestReadyVideo(payload: unknown): { uid: string } | null {
  if (!payload || typeof payload !== 'object') return null;
  const result = (payload as Record<string, unknown>).result;
  if (!Array.isArray(result) || result.length === 0) return null;
  const newest: unknown = result[0];
  if (!newest || typeof newest !== 'object') return null;
  const record = newest as Record<string, unknown>;
  const status = record.status;
  if (
    typeof record.uid === 'string' &&
    status &&
    typeof status === 'object' &&
    (status as Record<string, unknown>).state === 'ready'
  ) {
    return { uid: record.uid };
  }
  return null;
}
