import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CreateOfferDto,
  ListOffersQueryDto,
  OfferResponseDto,
  ProductModelResponseDto,
} from '@products';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import { ProductsRpcService } from './products-rpc.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsRpcService: ProductsRpcService) {}

  @ApiOperation({ summary: 'Lay danh sach product model' })
  @ApiOkResponse({
    description: 'Danh sach product model.',
    type: ProductModelResponseDto,
    isArray: true,
  })
  @Get('models')
  findModels() {
    return this.productsRpcService.findModels();
  }

  @ApiOperation({ summary: 'Lay chi tiet mot product model' })
  @ApiParam({ name: 'id', description: 'ID product model can xem.' })
  @ApiOkResponse({
    description: 'Thong tin product model.',
    type: ProductModelResponseDto,
  })
  @Get('models/:id')
  findModelById(@Param('id') id: string) {
    return this.productsRpcService.findModelById({ id });
  }

  @ApiOperation({ summary: 'Tao offer moi cho shop hien tai' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao offer thanh cong.',
    type: OfferResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Shop khong thuoc user hien tai hoac du lieu offer khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('offers')
  createOffer(@CurrentUserId() sellerUserId: string, @Body() dto: CreateOfferDto) {
    return this.productsRpcService.createOffer({
      sellerUserId,
      shopId: dto.shopId,
      categoryId: dto.categoryId,
      productModelId: dto.productModelId,
      title: dto.title,
      description: dto.description,
      price: dto.price,
      currency: dto.currency,
      salesMode: dto.salesMode,
      minWholesaleQty: dto.minWholesaleQty,
      itemCondition: dto.itemCondition,
      availableQuantity: dto.availableQuantity,
      verificationLevel: dto.verificationLevel,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach offer' })
  @ApiOkResponse({
    description: 'Danh sach offer.',
    type: OfferResponseDto,
    isArray: true,
  })
  @Get('offers')
  findOffers(@Query() query: ListOffersQueryDto) {
    return this.productsRpcService.findOffers({
      shopId: query.shopId,
    });
  }

  @ApiOperation({ summary: 'Lay chi tiet mot offer' })
  @ApiParam({ name: 'id', description: 'ID offer can xem.' })
  @ApiOkResponse({
    description: 'Thong tin offer.',
    type: OfferResponseDto,
  })
  @Get('offers/:id')
  findOfferById(@Param('id') id: string) {
    return this.productsRpcService.findOfferById({ id });
  }
}
