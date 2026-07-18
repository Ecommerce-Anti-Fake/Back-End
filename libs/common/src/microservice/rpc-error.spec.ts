import { toVietnameseMessage } from './rpc-error';

describe('toVietnameseMessage', () => {
  it('identifies the invalid field for class-validator errors', () => {
    expect(toVietnameseMessage(['phone must be a string'])).toEqual([
      'Số điện thoại: không được để trống và phải là chuỗi.',
    ]);
  });

  it('keeps multiple validation fields visible', () => {
    expect(toVietnameseMessage(['shopName must be longer than or equal to 3 characters', 'categoryIds must be an array'])).toEqual([
      'Tên shop: phải có ít nhất 3 ký tự.',
      'Danh mục sản phẩm: phải là danh sách.',
    ]);
  });
});
