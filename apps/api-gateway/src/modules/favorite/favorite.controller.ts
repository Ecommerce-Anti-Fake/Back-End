import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import { ProductsRpcService } from '../products/products-rpc.service';

@ApiTags('Favorite')
@Controller('products')
export class FavoriteController {
  constructor(private readonly productsRpcService: ProductsRpcService) {}

  @ApiOperation({ summary: 'Lay danh sach offer yeu thich cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach ID offer da yeu thich.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('favorites')
  findFavoriteOffers(@CurrentUserId() userId: string) {
    return this.productsRpcService.findFavoriteOffers({ userId });
  }

  @ApiOperation({ summary: 'Them offer vao danh muc yeu thich' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Offer da duoc them vao yeu thich.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('offers/:offerId/favorite')
  addFavoriteOffer(@Param('offerId') offerId: string, @CurrentUserId() userId: string) {
    return this.productsRpcService.addFavoriteOffer({ userId, offerId });
  }

  @ApiOperation({ summary: 'Xoa offer khoi danh muc yeu thich' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Offer da duoc xoa khoi yeu thich.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Delete('offers/:offerId/favorite')
  removeFavoriteOffer(@Param('offerId') offerId: string, @CurrentUserId() userId: string) {
    return this.productsRpcService.removeFavoriteOffer({ userId, offerId });
  }
}
