import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersRpcService } from '../order/orders-rpc.service';
import { parseAddressProvinceCode, toAddressProvinceCode, toAddressWardCode } from './address-location-code.util';

type GhnProvinceLocation = {
  provinceId: number;
  provinceName: string;
};

type GhnDistrictLocation = {
  districtId: number;
};

type GhnWardLocation = {
  wardCode: string;
  wardName: string;
};

@ApiTags('Address')
@Controller('addresses')
export class AddressLocationController {
  constructor(private readonly ordersRpcService: OrdersRpcService) {}

  @ApiOperation({ summary: 'Lay danh sach tinh/thanh de luu dia chi' })
  @Get('provinces')
  async listProvinces() {
    const provinces = (await this.ordersRpcService.listGhnProvinces()) as GhnProvinceLocation[];
    return provinces.map((province) => ({
      provinceCode: toAddressProvinceCode(province.provinceId),
      provinceName: province.provinceName,
    }));
  }

  @ApiOperation({ summary: 'Lay danh sach phuong/xa theo tinh/thanh de luu dia chi' })
  @Get('wards')
  async listWards(@Query('provinceCode') provinceCode: string) {
    const parsedProvince = parseAddressProvinceCode(provinceCode);
    if (!parsedProvince) {
      return [];
    }

    const districts = (await this.ordersRpcService.listGhnDistricts({
      provinceId: parsedProvince.provinceId,
    })) as GhnDistrictLocation[];
    const wardGroups = await Promise.all(
      districts.map(async (district) => {
        const wards = (await this.ordersRpcService.listGhnWards({ districtId: district.districtId })) as GhnWardLocation[];
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
