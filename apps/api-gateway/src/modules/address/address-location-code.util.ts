export function toAddressProvinceCode(provinceId: number) {
  return `VN-P${provinceId}`;
}

export function toAddressWardCode(input: { provinceId: number; districtId: number; carrierWardCode: string }) {
  return `VN-P${input.provinceId}-D${input.districtId}-W${input.carrierWardCode}`;
}

export function parseAddressProvinceCode(provinceCode?: string | null) {
  const match = provinceCode?.trim().match(/^VN-P(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    provinceId: Number(match[1]),
  };
}

export function parseAddressWardCode(wardCode?: string | null) {
  const match = wardCode?.trim().match(/^VN-P(\d+)-D(\d+)-W(.+)$/);
  if (!match) {
    return null;
  }

  return {
    provinceId: Number(match[1]),
    districtId: Number(match[2]),
    carrierWardCode: match[3],
  };
}
