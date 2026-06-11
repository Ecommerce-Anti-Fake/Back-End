import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import { GhnDistrictsQueryDto, GhnServicesQueryDto, GhnWardsQueryDto } from '@orders';
import { OrdersRpcService } from '../order/orders-rpc.service';
import { DashboardSseBrokerService } from '../users/dashboard-sse-broker.service';

@ApiTags('Shipping')
@Controller('orders')
export class OrderShippingController {
  constructor(
    private readonly ordersRpcService: OrdersRpcService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
  ) {}

  @ApiOperation({ summary: 'Lay danh sach tinh/thanh GHN cho checkout' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('shipping/ghn/provinces')
  listGhnProvinces() {
    return this.ordersRpcService.listGhnProvinces();
  }

  @ApiOperation({ summary: 'Lay danh sach quan/huyen GHN theo tinh/thanh' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('shipping/ghn/districts')
  listGhnDistricts(@Query() query: GhnDistrictsQueryDto) {
    return this.ordersRpcService.listGhnDistricts({ provinceId: query.provinceId });
  }

  @ApiOperation({ summary: 'Lay danh sach phuong/xa GHN theo quan/huyen' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('shipping/ghn/wards')
  listGhnWards(@Query() query: GhnWardsQueryDto) {
    return this.ordersRpcService.listGhnWards({ districtId: query.districtId });
  }

  @ApiOperation({ summary: 'Lay dich vu GHN kha dung theo quan/huyen nhan hang' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('shipping/ghn/services')
  listGhnServices(@Query() query: GhnServicesQueryDto) {
    return this.ordersRpcService.listGhnServices({ districtId: query.districtId });
  }

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
