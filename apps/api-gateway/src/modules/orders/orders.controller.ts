import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateRetailOrderDto, CreateWholesaleOrderDto, MarkOrderPaidDto, OrderResponseDto } from '@orders';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import { OrdersRpcService } from './orders-rpc.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersRpcService: OrdersRpcService) {}

  @ApiOperation({ summary: 'Tao don le tu offer' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao don le thanh cong.',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Offer khong ho tro ban le hoac quantity khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('retail')
  createRetail(@CurrentUserId() buyerUserId: string, @Body() dto: CreateRetailOrderDto) {
    return this.ordersRpcService.createRetail({
      buyerUserId,
      offerId: dto.offerId,
      quantity: dto.quantity,
      affiliateCode: dto.affiliateCode ?? null,
    });
  }

  @ApiOperation({ summary: 'Tao don si giua cac shop' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao don si thanh cong.',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Offer khong ho tro ban si, quantity khong dat nguong, hoac buyer shop khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('wholesale')
  createWholesale(@CurrentUserId() buyerUserId: string, @Body() dto: CreateWholesaleOrderDto) {
    return this.ordersRpcService.createWholesale({
      buyerUserId,
      buyerShopId: dto.buyerShopId,
      buyerDistributionNodeId: dto.buyerDistributionNodeId,
      offerId: dto.offerId,
      quantity: dto.quantity,
      affiliateCode: dto.affiliateCode ?? null,
    });
  }

  @ApiOperation({ summary: 'Lay chi tiet mot don hang' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'ID don hang.' })
  @ApiOkResponse({
    description: 'Thong tin chi tiet don hang.',
    type: OrderResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Khong co quyen xem don hang nay.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':id')
  findById(@Param('id') id: string, @CurrentUserId() requesterUserId: string) {
    return this.ordersRpcService.findById({ id, requesterUserId });
  }

  @ApiOperation({ summary: 'Buyer xac nhan don hang da thanh toan' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'ID don hang.' })
  @ApiOkResponse({
    description: 'Cap nhat thanh toan thanh cong.',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Chi don pending moi duoc danh dau da thanh toan.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi buyer moi co quyen danh dau thanh toan.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/mark-paid')
  markPaid(
    @Param('id') id: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: MarkOrderPaidDto,
  ) {
    return this.ordersRpcService.markPaid({
      id,
      requesterUserId,
      providerRef: dto.providerRef ?? null,
    });
  }

  @ApiOperation({ summary: 'Seller xac nhan hoan tat don hang' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'ID don hang.' })
  @ApiOkResponse({
    description: 'Hoan tat don hang thanh cong.',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Chi don paid moi duoc hoan tat.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi seller moi co quyen hoan tat don hang.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/complete')
  complete(@Param('id') id: string, @CurrentUserId() requesterUserId: string) {
    return this.ordersRpcService.complete({
      id,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Buyer hoac seller huy don hang khi con pending' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'ID don hang.' })
  @ApiOkResponse({
    description: 'Huy don hang thanh cong.',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Chi don pending moi duoc huy.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi buyer hoac seller moi co quyen huy don.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUserId() requesterUserId: string) {
    return this.ordersRpcService.cancel({
      id,
      requesterUserId,
    });
  }
}
