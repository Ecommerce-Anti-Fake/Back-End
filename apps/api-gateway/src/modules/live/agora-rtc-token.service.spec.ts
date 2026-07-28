import { ServiceUnavailableException } from '@nestjs/common';
import {
  AgoraRtcTokenService,
  agoraChannelName,
} from './agora-rtc-token.service';

describe('AgoraRtcTokenService', () => {
  const values: Record<string, string> = {
    AGORA_APP_ID: '0123456789abcdef0123456789abcdef',
    AGORA_APP_CERTIFICATE: 'abcdef0123456789abcdef0123456789',
    AGORA_RTC_TOKEN_TTL_SECONDS: '3600',
  };
  const configService = {
    get: jest.fn((key: string) => values[key]),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('issues a short-lived channel token with a stable server-derived uid', () => {
    const service = new AgoraRtcTokenService(configService as never);
    service.onModuleInit();

    const first = service.issueToken({
      sessionId: '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
      clientId: '8954d00d-dbf8-4dc4-a9b7-30b94d1df8ea',
      role: 'SUBSCRIBER',
    });
    const renewed = service.issueToken({
      sessionId: '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
      clientId: '8954d00d-dbf8-4dc4-a9b7-30b94d1df8ea',
      role: 'SUBSCRIBER',
    });

    expect(first).toMatchObject({
      appId: values.AGORA_APP_ID,
      channelName: 'live_3f40b6b432c441fea34453db0e2c9930',
      role: 'SUBSCRIBER',
      uid: renewed.uid,
    });
    expect(first.uid).toBeGreaterThan(0);
    expect(first.token).toMatch(/^007/);
    expect(new Date(first.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(first).not.toHaveProperty('appCertificate');
  });

  it('keeps the uid stable when server-authorized privileges change', () => {
    const service = new AgoraRtcTokenService(configService as never);

    const audience = service.issueToken({
      sessionId: '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
      clientId: '8954d00d-dbf8-4dc4-a9b7-30b94d1df8ea',
      role: 'SUBSCRIBER',
    });
    const host = service.issueToken({
      sessionId: '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
      clientId: '8954d00d-dbf8-4dc4-a9b7-30b94d1df8ea',
      role: 'PUBLISHER',
    });

    expect(host.role).toBe('PUBLISHER');
    expect(host.uid).toBe(audience.uid);
    expect(host.token).not.toBe(audience.token);
  });

  it('rejects missing configuration when a token is requested', () => {
    const service = new AgoraRtcTokenService({
      get: jest.fn(),
    } as never);

    expect(() =>
      service.issueToken({
        sessionId: '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
        clientId: '8954d00d-dbf8-4dc4-a9b7-30b94d1df8ea',
        role: 'SUBSCRIBER',
      }),
    ).toThrow(ServiceUnavailableException);
  });

  it('fails startup when any required Agora variable is missing', () => {
    const service = new AgoraRtcTokenService({
      get: jest.fn((key: string) =>
        key === 'AGORA_RTC_TOKEN_TTL_SECONDS' ? undefined : values[key],
      ),
    } as never);

    expect(() => service.onModuleInit()).toThrow(
      'AGORA_RTC_TOKEN_TTL_SECONDS is required',
    );
  });

  it('keeps Agora channel names within the documented 64-byte limit', () => {
    expect(agoraChannelName('3f40b6b4-32c4-41fe-a344-53db0e2c9930')).toBe(
      'live_3f40b6b432c441fea34453db0e2c9930',
    );
    expect(
      Buffer.byteLength(
        agoraChannelName('3f40b6b4-32c4-41fe-a344-53db0e2c9930'),
      ),
    ).toBeLessThan(64);
  });
});
