import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import { AddCartItemDto, CheckoutCartItemDto, QuoteCartItemShippingOptionsDto, UpdateCartItemDto } from '@orders';
import { DashboardSseBrokerService } from '../users/dashboard-sse-broker.service';
import { OrdersRpcService } from '../order/orders-rpc.service';

@ApiTags('Cart')
@Controller('orders')
export class CartController {
  constructor(
    private readonly ordersRpcService: OrdersRpcService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
  ) {}

  @ApiOperation({ summary: 'Lay gio hang active cua buyer hien tai' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('cart')
  getActiveCart(@CurrentUserId() buyerUserId: string) {
    return this.ordersRpcService.getActiveCart({ buyerUserId });
  }

  @ApiOperation({ summary: 'Them offer vao gio hang active cua buyer' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('cart/items')
  addCartItem(@CurrentUserId() buyerUserId: string, @Body() dto: AddCartItemDto) {
    return this.ordersRpcService.addCartItem({
      buyerUserId,
      offerId: dto.offerId,
      quantity: dto.quantity,
    });
  }

  @ApiOperation({ summary: 'Cap nhat so luong mot cart item' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch('cart/items/:cartItemId')
  updateCartItem(
    @CurrentUserId() buyerUserId: string,
    @Param('cartItemId') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.ordersRpcService.updateCartItem({
      buyerUserId,
      cartItemId,
      quantity: dto.quantity,
    });
  }

  @ApiOperation({ summary: 'Xoa mot cart item khoi gio hang' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Delete('cart/items/:cartItemId')
  removeCartItem(@CurrentUserId() buyerUserId: string, @Param('cartItemId') cartItemId: string) {
    return this.ordersRpcService.removeCartItem({
      buyerUserId,
      cartItemId,
    });
  }

  @ApiOperation({ summary: 'Checkout mot cart item thanh retail order' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('cart/items/:cartItemId/checkout')
  async checkoutCartItem(
    @CurrentUserId() buyerUserId: string,
    @Param('cartItemId') cartItemId: string,
    @Body() dto: CheckoutCartItemDto,
  ) {
    const result = await this.ordersRpcService.checkoutCartItem({
      buyerUserId,
      cartItemId,
      affiliateCode: dto.affiliateCode ?? null,
      paymentMethod: dto.paymentMethod ?? null,
      shippingName: dto.shippingName ?? null,
      shippingPhone: dto.shippingPhone ?? null,
      shippingAddress: dto.shippingAddress ?? null,
      shippingDistrictId: dto.shippingDistrictId ?? null,
      shippingDistrictName: dto.shippingDistrictName ?? null,
      shippingWardCode: dto.shippingWardCode ?? null,
      shippingWardName: dto.shippingWardName ?? null,
      shippingProviderCode: dto.shippingProviderCode ?? null,
      shippingServiceId: dto.shippingServiceId ?? null,
      shippingServiceTypeId: dto.shippingServiceTypeId ?? null,
    });
    this.dashboardSseBrokerService.notifyOrderChanged(result, buyerUserId);

    return result;
  }

  @ApiTags('Shipping')
  @ApiOperation({ summary: 'Bao gia cac phuong thuc van chuyen cho mot cart item' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('cart/items/:cartItemId/shipping-options')
  quoteCartItemShippingOptions(
    @CurrentUserId() buyerUserId: string,
    @Param('cartItemId') cartItemId: string,
    @Body() dto: QuoteCartItemShippingOptionsDto,
  ) {
    return this.ordersRpcService.quoteCartItemShippingOptions({
      buyerUserId,
      cartItemId,
      shippingAddress: dto.shippingAddress ?? null,
      shippingDistrictId: dto.shippingDistrictId ?? null,
      shippingWardCode: dto.shippingWardCode ?? null,
    });
  }
}
