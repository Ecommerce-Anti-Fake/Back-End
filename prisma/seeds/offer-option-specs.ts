export type OfferOptionSpec = {
  displayName: string;
  values: readonly [string, string];
};

/** Option values are ordered to match the 15 product templates in 04-offers.seed.ts. */
export const offerOptionSpecsByTemplate: readonly (readonly [OfferOptionSpec, OfferOptionSpec])[] = [
  [{ displayName: 'Dung tích', values: ['1L', '180ml'] }, { displayName: 'Quy cách', values: ['Hộp lẻ', 'Thùng 12 hộp'] }],
  [{ displayName: 'Dung tích', values: ['500ml', '1.5L'] }, { displayName: 'Quy cách', values: ['Chai lẻ', 'Lốc 24 chai'] }],
  [{ displayName: 'Khối lượng', values: ['500g', '1kg'] }, { displayName: 'Dạng sản phẩm', values: ['Hạt rang', 'Xay sẵn'] }],
  [{ displayName: 'Hương vị', values: ['Bò hầm', 'Gà'] }, { displayName: 'Quy cách', values: ['Gói lẻ', 'Thùng 30 gói'] }],
  [{ displayName: 'Dung tích', values: ['750ml', '1.5L'] }, { displayName: 'Quy cách', values: ['Chai lẻ', 'Combo 2 chai'] }],
  [{ displayName: 'Dung tích', values: ['50ml', '100ml'] }, { displayName: 'Loại da', values: ['Mọi loại da', 'Da nhạy cảm'] }],
  [{ displayName: 'Dung tích', values: ['500ml', '1L'] }, { displayName: 'Mùi hương', values: ['Gạo non', 'Hoa nhẹ'] }],
  [{ displayName: 'Kích thước', values: ['24cm', '28cm'] }, { displayName: 'Màu sắc', values: ['Inox bạc', 'Đen'] }],
  [{ displayName: 'Dung tích', values: ['500ml', '750ml'] }, { displayName: 'Màu sắc', values: ['Bạc', 'Đen'] }],
  [{ displayName: 'Màu sắc', values: ['Đen', 'Trắng'] }, { displayName: 'Kích thước', values: ['40', '41'] }],
  [{ displayName: 'Màu sắc', values: ['Trắng', 'Đen'] }, { displayName: 'Kích thước', values: ['M', 'L'] }],
  [{ displayName: 'Khối lượng', values: ['500g', '1kg'] }, { displayName: 'Quy cách', values: ['Túi zip', 'Hộp quà'] }],
  [{ displayName: 'Khối lượng', values: ['20 túi', '50 túi'] }, { displayName: 'Quy cách', values: ['Hộp lẻ', 'Lô 5 hộp'] }],
  [{ displayName: 'Khối lượng', values: ['400g', '900g'] }, { displayName: 'Độ tuổi', values: ['0-6 tháng', '6-12 tháng'] }],
  [{ displayName: 'Kích thước', values: ['A5', 'A4'] }, { displayName: 'Màu bìa', values: ['Xanh', 'Đen'] }],
] as const;

export function offerOptionSpecs(templateIndex: number): readonly [OfferOptionSpec, OfferOptionSpec] {
  return offerOptionSpecsByTemplate[templateIndex] ?? offerOptionSpecsByTemplate[0];
}

export function offerTemplateIndexForText(modelName: string, title: string): number {
  const text = `${modelName} ${title}`.toLocaleLowerCase('vi-VN');
  const markers = [
    'sữa tươi',
    'nước khoáng',
    'cà phê',
    'mì gói',
    'nước rửa chén',
    'kem chống nắng',
    'sữa tắm',
    'nồi inox',
    'bình giữ nhiệt',
    'giày thể thao',
    'áo thun',
    'hạt điều',
    'trà atiso',
    'sữa bột',
    'sổ tay',
  ];
  const index = markers.findIndex((marker) => text.includes(marker));
  if (index < 0) throw new Error(`Cannot map offer to a product template: ${modelName}`);
  return index;
}
