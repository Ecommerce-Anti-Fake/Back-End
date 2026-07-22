import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import {
  AddCartItemDto,
  CartShippingOptionsResponseDto,
  CheckoutCartDto,
  CheckoutCartItemDto,
  QuoteCartShippingOptionsDto,
  UpdateCartItemDto,
  QuoteCartCheckoutDto,
} from '@orders';
import { DashboardSseBrokerService } from '../user/dashboard-sse-broker.service';
import { OrdersRpcService } from '../order/orders-rpc.service';

class CartMutationSuccessResponseDto {
  success!: boolean;
}

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(
    private readonly ordersRpcService: OrdersRpcService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
  ) {}

  @ApiOperation({ summary: 'Lay gio hang active cua buyer hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    schema: {
      example: {
        id: 'cart-id',
        buyerUserId: 'buyer-user-id',
        shops: [],
      },
    },
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get()
  getActiveCart(@CurrentUserId() buyerUserId: string) {
    return this.ordersRpcService.getActiveCart({ buyerUserId });
  }

  @ApiOperation({ summary: 'Them offer vao gio hang active cua buyer' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: CartMutationSuccessResponseDto })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('items')
  async addCartItem(@CurrentUserId() buyerUserId: string, @Body() dto: AddCartItemDto) {
    await this.ordersRpcService.addCartItem({
      buyerUserId,
      offerId: dto.offerId,
      variantId: dto.variantId ?? null,
      quantity: dto.quantity,
    });
    return { success: true };
  }

  @ApiOperation({ summary: 'Cap nhat so luong mot cart item' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch('items/:cartItemId')
  updateCartItem(@CurrentUserId() buyerUserId: string, @Param('cartItemId') cartItemId: string, @Body() dto: UpdateCartItemDto) {
    return this.ordersRpcService.updateCartItem({
      buyerUserId,
      cartItemId,
      quantity: dto.quantity,
    });
  }

  @ApiOperation({ summary: 'Xoa mot cart item khoi gio hang' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Delete('items/:cartItemId')
  removeCartItem(@CurrentUserId() buyerUserId: string, @Param('cartItemId') cartItemId: string) {
    return this.ordersRpcService.removeCartItem({
      buyerUserId,
      cartItemId,
    });
  }

  @ApiOperation({ summary: 'Checkout mot cart item thanh order' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('items/:cartItemId/checkout')
  async checkoutCartItem(@CurrentUserId() buyerUserId: string, @Param('cartItemId') cartItemId: string, @Body() dto: CheckoutCartItemDto) {
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

  @ApiOperation({ summary: 'Checkout cac cart item da chon' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('checkout')
  async checkoutCart(@CurrentUserId() buyerUserId: string, @Body() dto: CheckoutCartDto) {
    const result = await this.ordersRpcService.checkoutCart({
      buyerUserId,
      cartItemIds: dto.cartItemIds,
      paymentMethod: dto.paymentMethod,
      shippingOptionCode: dto.shippingOptionCode,
      affiliateCode: dto.affiliateCode ?? null,
      systemVoucherCode: dto.systemVoucherCode ?? null,
      shopVouchers: dto.shopVouchers ?? [],
      shippingVouchers: dto.shippingVouchers ?? [],
    });
    this.dashboardSseBrokerService.notifyOrderChanged(result, buyerUserId);

    return result;
  }

  @ApiOperation({ summary: 'Bao gia checkout va voucher truoc khi dat hang' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('checkout/quote')
  quoteCheckout(@CurrentUserId() buyerUserId: string, @Body() dto: QuoteCartCheckoutDto) {
    return this.ordersRpcService.quoteCartCheckout({
      buyerUserId,
      cartItemIds: dto.cartItemIds,
      shippingOptionCode: dto.shippingOptionCode,
      systemVoucherCode: dto.systemVoucherCode ?? null,
      shopVouchers: dto.shopVouchers ?? [],
      shippingVouchers: dto.shippingVouchers ?? [],
    });
  }

  @ApiTags('Shipping')
  @ApiOperation({
    summary: 'Bao gia cac phuong thuc van chuyen cho cac cart item da chon',
  })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: CartShippingOptionsResponseDto })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('shipping-options')
  quoteCartShippingOptions(@CurrentUserId() buyerUserId: string, @Body() dto: QuoteCartShippingOptionsDto) {
    return this.ordersRpcService.quoteCartShippingOptions({
      buyerUserId,
      cartItemIds: dto.cartItemIds,
    });
  }
}
