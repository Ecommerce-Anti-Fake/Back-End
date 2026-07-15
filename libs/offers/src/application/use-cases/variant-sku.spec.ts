import { buildVariantSku } from './variant-sku';

describe('buildVariantSku', () => {
  it('joins option values and preserves Vietnamese text', () => {
    expect(buildVariantSku([' Xanh ', 'M'])).toBe('Xanh-M');
    expect(buildVariantSku(['Đỏ', 'L'])).toBe('Đỏ-L');
  });
});
