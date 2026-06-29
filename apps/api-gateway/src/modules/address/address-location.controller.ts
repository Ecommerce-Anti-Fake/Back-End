import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddressCatalogService } from './address-catalog.service';

@ApiTags('Address')
@Controller('addresses')
export class AddressLocationController {
  constructor(private readonly addressCatalogService: AddressCatalogService) {}

  @ApiOperation({ summary: 'Lay danh sach tinh/thanh de luu dia chi' })
  @Get('provinces')
  async listProvinces() {
    return this.addressCatalogService.listProvinces();
  }

  @ApiOperation({ summary: 'Lay danh sach phuong/xa theo tinh/thanh de luu dia chi' })
  @Get('wards')
  async listWards(@Query('provinceCode') provinceCode: string) {
    return this.addressCatalogService.listWards(provinceCode);
  }
}
