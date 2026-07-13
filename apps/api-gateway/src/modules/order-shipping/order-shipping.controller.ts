import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import { OrdersRpcService } from '../order/orders-rpc.service';
import { DashboardSseBrokerService } from '../user/dashboard-sse-broker.service';

@ApiTags('Shipping')
@Controller('orders')
export class OrderShippingController {
  constructor(
    private readonly ordersRpcService: OrdersRpcService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
  ) {}

  @ApiOperation({ summary: 'Seller tao van don voi don vi van chuyen da chon' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @ApiParam({
    name: 'orderId',
    description: 'ID của đơn hàng cần tạo vận đơn',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Post(':orderId/shipping/book')
  async bookShipping(@Param('orderId') orderId: string, @CurrentUserId() requesterUserId: string) {
    const result = await this.ordersRpcService.bookShipping({
      id: orderId,
      requesterUserId,
    });
    this.dashboardSseBrokerService.notifyOrderChanged(result);

    return result;
  }

  @ApiOperation({ summary: 'Seller dong bo trang thai van chuyen tu carrier' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/shipping/sync')
  async syncShippingStatus(@Param('id') id: string, @CurrentUserId() requesterUserId: string) {
    const result = await this.ordersRpcService.syncShippingStatus({
      id,
      requesterUserId,
    });
    this.dashboardSseBrokerService.notifyOrderChanged(result);

    return result;
  }
}
