import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @Post(':id/shipping/book')
  async bookShipping(@Param('id') id: string, @CurrentUserId() requesterUserId: string) {
    const result = await this.ordersRpcService.bookShipping({
      id,
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
