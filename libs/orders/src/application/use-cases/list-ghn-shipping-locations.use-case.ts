import { Injectable } from '@nestjs/common';
import { ShippingCarrierAdapterService } from '../services';

@Injectable()
export class ListGhnShippingLocationsUseCase {
  constructor(private readonly shippingCarrierAdapterService: ShippingCarrierAdapterService) {}

  listProvinces() {
    return this.shippingCarrierAdapterService.listGhnProvinces();
  }

  listDistricts(provinceId: number) {
    return this.shippingCarrierAdapterService.listGhnDistricts(provinceId);
  }

  listWards(districtId: number) {
    return this.shippingCarrierAdapterService.listGhnWards(districtId);
  }

  listServices(districtId: number) {
    return this.shippingCarrierAdapterService.listGhnServices(districtId);
  }
}
