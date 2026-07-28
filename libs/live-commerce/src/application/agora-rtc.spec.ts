import { buildAgoraCutoverPlan } from './agora-rtc';

describe('buildAgoraCutoverPlan', () => {
  it('maps only scheduled legacy sessions and preserves terminal history', () => {
    expect(
      buildAgoraCutoverPlan([
        {
          id: '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
          status: 'SCHEDULED',
        },
        {
          id: 'e55c814f-a7af-4ec7-a850-f3b0a45791d4',
          status: 'ENDED',
        },
      ]),
    ).toEqual([
      {
        sessionId: '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
        channelName: 'live_3f40b6b432c441fea34453db0e2c9930',
      },
    ]);
  });

  it('refuses cutover while a legacy livestream is live', () => {
    expect(() =>
      buildAgoraCutoverPlan([
        {
          id: '3f40b6b4-32c4-41fe-a344-53db0e2c9930',
          status: 'LIVE',
        },
      ]),
    ).toThrow('End all active Cloudflare livestreams');
  });
});
