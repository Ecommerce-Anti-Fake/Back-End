import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShippingCarrierResponseDto } from '@products';
import { RateLimit } from '../../observability';
import { ProductsRpcService } from '../products/products-rpc.service';

@ApiTags('Shipping')
@Controller('products')
export class ShippingController {
  constructor(private readonly productsRpcService: ProductsRpcService) {}

  @ApiOperation({ summary: 'Lay danh sach don vi van chuyen co the chon cho offer' })
  @ApiOkResponse({
    description: 'Danh sach don vi van chuyen.',
    type: ShippingCarrierResponseDto,
    isArray: true,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('shipping-carriers')
  findShippingCarriers() {
    return this.productsRpcService.findShippingCarriers();
  }
}
