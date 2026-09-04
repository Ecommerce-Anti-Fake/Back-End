import { classifySyntheticSignals } from './audit-demo-environment';
import type { AuditShop, AuditUser } from './audit-demo-environment';

const syntheticUsers: AuditUser[] = [
  {
    email: 'buyer@antifake.local',
    displayName: 'Nguoi dung Demo UAT 01',
  },
];
const syntheticShops: AuditShop[] = [{ shopName: 'Cua hang Demo UAT 01' }];

describe('demo environment audit', () => {
  it('accepts marker-only synthetic records as mutation-review eligible', () => {
    expect(
      classifySyntheticSignals(syntheticUsers, syntheticShops),
    ).toMatchObject({
      userCount: 1,
      shopCount: 1,
      externalEmailCount: 0,
      unmarkedUserCount: 0,
      unmarkedShopCount: 0,
      safeForMutation: true,
      reasons: [],
    });
  });

  it('holds when external email domains or unmarked shops exist', () => {
    const result = classifySyntheticSignals(
      [
        ...syntheticUsers,
        { email: 'person@gmail.com', displayName: 'Nguyen Van A' },
      ],
      [...syntheticShops, { shopName: 'Cua hang khong ro nguon' }],
    );

    expect(result).toMatchObject({
      externalEmailCount: 1,
      unmarkedUserCount: 1,
      unmarkedShopCount: 1,
      safeForMutation: false,
    });
    expect(result.reasons).toEqual([
      'external email-domain records',
      'users without synthetic markers',
      'shops without synthetic markers',
    ]);
  });
});
