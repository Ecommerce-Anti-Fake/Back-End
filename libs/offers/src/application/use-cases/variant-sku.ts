export function buildVariantSku(optionValueTexts: string[]) {
  return optionValueTexts.map((text) => text.trim()).join('-');
}
