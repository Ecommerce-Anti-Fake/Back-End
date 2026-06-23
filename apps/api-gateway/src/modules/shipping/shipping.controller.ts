import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShippingCarrierResponseDto } from '@catalog-metadata';
import { RateLimit } from '../../observability';
import { CatalogRpcService } from '../offer/catalog-rpc.service';

@ApiTags('Shipping')
@Controller()
export class ShippingController {
  constructor(private readonly catalogRpcService: CatalogRpcService) {}

  @ApiOperation({
    summary: 'Lay danh sach don vi van chuyen co the chon cho offer',
  })
  @ApiOkResponse({
    description: 'Danh sach don vi van chuyen.',
    type: ShippingCarrierResponseDto,
    isArray: true,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('shipping-carriers')
  findShippingCarriers() {
    return this.catalogRpcService.findShippingCarriers();
  }
}
