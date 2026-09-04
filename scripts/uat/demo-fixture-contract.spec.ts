import {
  assertSyntheticFixtureValue,
  DEMO_ACCOUNT_ALIASES,
  DEMO_FIXTURE_NAMES,
  validateDemoFixtureSnapshot,
} from './demo-fixture-contract';

describe('UAT demo fixture contract', () => {
  it('uses the owner-approved account aliases without storing credentials', () => {
    expect(DEMO_ACCOUNT_ALIASES).toEqual({
      buyer: 'seed.user01@antifake.local',
      seller: 'seed.user02@antifake.local',
      admin: 'admin@antifake.io.vn',
    });
    expect(Object.values(DEMO_ACCOUNT_ALIASES).join(' ')).not.toMatch(
      /password|token|secret/i,
    );
  });

  it('requires namespaced fixture values', () => {
    expect(assertSyntheticFixtureValue(DEMO_FIXTURE_NAMES.offer, 'offer')).toBe(
      'DOCS_UAT_San_pham',
    );
    expect(() =>
      assertSyntheticFixtureValue('Customer Product', 'offer'),
    ).toThrow(/namespace/i);
  });

  it('reports incomplete runtime fixture relationships', () => {
    const result = validateDemoFixtureSnapshot({
      aliases: { buyer: true, seller: true, admin: false },
      entities: { shop: true, chat: false },
      positiveQr: false,
      orderStatuses: { pending: 1, confirmed: 0, shipping: 1, completed: 1 },
    });

    expect(result).toEqual({
      ok: false,
      missing: [
        'approved account: admin',
        'chat',
        'positive QR/provenance verification',
        'order lifecycle: confirmed',
      ],
    });
  });
});
