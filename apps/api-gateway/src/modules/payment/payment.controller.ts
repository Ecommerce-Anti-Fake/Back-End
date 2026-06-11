import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PayOSWebhookMessage } from '@contracts';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import { AdminFinanceReconciliationQueryDto, MarkOrderPaidDto } from '@orders';
import { RateLimit } from '../../observability';
import { OrdersRpcService } from '../order/orders-rpc.service';
import { DashboardSseBrokerService } from '../users/dashboard-sse-broker.service';

@ApiTags('Payment')
@Controller('orders')
export class PaymentController {
  constructor(
    private readonly ordersRpcService: OrdersRpcService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
  ) {}

  @ApiOperation({ summary: 'Admin doi soat tai chinh don hang, escrow va affiliate' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/finance-reconciliation')
  getAdminFinanceReconciliation(@Query() query: AdminFinanceReconciliationQueryDto) {
    return this.ordersRpcService.getAdminFinanceReconciliation(query);
  }

  @ApiOperation({ summary: 'Buyer xac nhan don hang da thanh toan' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/mark-paid')
  async markPaid(
    @Param('id') id: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: MarkOrderPaidDto,
  ) {
    const result = await this.ordersRpcService.markPaid({
      id,
      requesterUserId,
      providerRef: dto.providerRef ?? null,
    });
    this.dashboardSseBrokerService.notifyOrderChanged(result, requesterUserId);

    return result;
  }

  @ApiOperation({ summary: 'Buyer tao lai link thanh toan payOS cho don pending bi fail' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/retry-payos-payment')
  async retryPayOSPayment(@Param('id') id: string, @CurrentUserId() requesterUserId: string) {
    const result = await this.ordersRpcService.retryPayOSPayment({
      id,
      requesterUserId,
    });
    this.dashboardSseBrokerService.notifyOrderChanged(result, requesterUserId);

    return result;
  }

  @ApiOperation({ summary: 'Webhook public nhan ket qua thanh toan tu payOS' })
  @RateLimit({ profile: 'paymentWebhook' })
  @Post('payos/webhook')
  async handlePayOSWebhook(@Body() payload: PayOSWebhookMessage) {
    const result = await this.ordersRpcService.handlePayOSWebhook(payload);
    this.dashboardSseBrokerService.notifyOrderChanged(result ?? {});

    return result;
  }

  @ApiOperation({ summary: 'Seller hoan tien cho don da thanh toan' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/refund')
  refund(@Param('id') id: string, @CurrentUserId() requesterUserId: string) {
    return this.ordersRpcService.refund({
      id,
      requesterUserId,
    });
  }
}
