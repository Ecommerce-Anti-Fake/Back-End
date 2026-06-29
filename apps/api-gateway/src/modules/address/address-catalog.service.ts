import { Injectable } from '@nestjs/common';
import { OrdersRpcService } from '../order/orders-rpc.service';
import { parseAddressProvinceCode, toAddressProvinceCode, toAddressWardCode } from './address-location-code.util';

type CarrierProvinceLocation = {
  provinceId: number;
  provinceName: string;
};

type CarrierDistrictLocation = {
  districtId: number;
};

type CarrierWardLocation = {
  wardCode: string;
  wardName: string;
};

export type AddressProvinceOption = {
  provinceCode: string;
  provinceName: string;
};

export type AddressWardOption = {
  provinceCode: string;
  wardCode: string;
  wardName: string;
};

@Injectable()
export class AddressCatalogService {
  constructor(private readonly ordersRpcService: OrdersRpcService) {}

  async listProvinces(): Promise<AddressProvinceOption[]> {
    const provinces = (await this.ordersRpcService.listGhnProvinces()) as CarrierProvinceLocation[];

    return provinces.map((province) => ({
      provinceCode: toAddressProvinceCode(province.provinceId),
      provinceName: province.provinceName,
    }));
  }

  async listWards(provinceCode: string): Promise<AddressWardOption[]> {
    const parsedProvince = parseAddressProvinceCode(provinceCode);
    if (!parsedProvince) {
      return [];
    }

    const districts = (await this.ordersRpcService.listGhnDistricts({
      provinceId: parsedProvince.provinceId,
    })) as CarrierDistrictLocation[];
    const wardGroups = await Promise.all(
      districts.map(async (district) => {
        const wards = (await this.ordersRpcService.listGhnWards({
          districtId: district.districtId,
        })) as CarrierWardLocation[];

        return wards.map((ward) => ({
          provinceCode,
          wardCode: toAddressWardCode({
            provinceId: parsedProvince.provinceId,
            districtId: district.districtId,
            carrierWardCode: ward.wardCode,
          }),
          wardName: ward.wardName,
        }));
      }),
    );

    return wardGroups.flat().sort((left, right) => left.wardName.localeCompare(right.wardName));
  }
}
