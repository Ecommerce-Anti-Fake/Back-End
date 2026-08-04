import { Body, Controller, Get, Headers, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PayOSWebhookMessage } from '@contracts';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import { AdminFinanceReconciliationQueryDto, MarkOrderPaidDto, RefundOrderDto } from '@orders';
import { RateLimit } from '../../observability';
import { OrdersRpcService } from '../order/orders-rpc.service';
import { DashboardSseBrokerService } from '../user/dashboard-sse-broker.service';
import { WalletRpcService } from '../wallet/wallet-rpc.service';
import type { Response } from 'express';

const PAYOS_RETURN_QUERY_KEYS = ['code', 'id', 'cancel', 'status', 'orderCode'] as const;

@ApiTags('Payment')
@Controller('orders')
export class PaymentController {
  constructor(
    private readonly ordersRpcService: OrdersRpcService,
    private readonly walletRpcService: WalletRpcService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Redirect payOS success return ve trang frontend thanh cong' })
  @Get('payos/return')
  handlePayOSReturn(
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() response: Response,
  ) {
    const target = new URL(
      this.isFailedPayOSReturn(query)
        ? this.resolveFrontendPaymentFailedUrl()
        : this.resolveFrontendPaymentSuccessUrl(),
    );
    for (const key of PAYOS_RETURN_QUERY_KEYS) {
      const value = query[key];
      if (typeof value === 'string' && value.trim()) {
        target.searchParams.set(key, value);
      }
    }

    response.redirect(302, target.toString());
  }

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
    if (this.isUnknownOrderWebhook(result)) {
      return this.walletRpcService.handleWalletTopUpWebhook(payload);
    }
    this.dashboardSseBrokerService.notifyOrderChanged(result ?? {});

    return result;
  }

  @ApiOperation({ summary: 'Seller hoan tien cho don da thanh toan' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/refund')
  refund(
    @Param('id') id: string,
    @CurrentUserId() requesterUserId: string,
    @Headers('idempotency-key') idempotencyHeader: string | undefined,
    @Body() body?: RefundOrderDto,
  ) {
    return this.ordersRpcService.refund({
      id,
      requesterUserId,
      items: body?.items,
      idempotencyKey: idempotencyHeader?.trim() || body?.idempotencyKey?.trim() || null,
    });
  }

  private resolveFrontendPaymentSuccessUrl() {
    const configured = this.configService.get<string>('PAYOS_FINAL_SUCCESS_URL')?.trim();
    if (configured) {
      return configured;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:5173';
    return `${frontendUrl.replace(/\/$/, '')}/payment-success`;
  }

  private isUnknownOrderWebhook(value: unknown) {
    if (!value || typeof value !== 'object') return false;
    const result = value as { ignored?: unknown; reason?: unknown };
    return result.ignored === true && result.reason === 'order_not_found';
  }

  private resolveFrontendPaymentFailedUrl() {
    const configured = this.configService.get<string>('PAYOS_FINAL_FAILED_URL')?.trim();
    if (configured) {
      return configured;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:5173';
    return `${frontendUrl.replace(/\/$/, '')}/payment-failed`;
  }

  private isFailedPayOSReturn(query: Record<string, string | string[] | undefined>) {
    const status = typeof query.status === 'string' ? query.status.toUpperCase() : '';
    const code = typeof query.code === 'string' ? query.code.trim() : '';
    return (
      query.cancel === 'true' ||
      ['CANCELLED', 'CANCELED', 'FAILED', 'EXPIRED'].includes(status) ||
      (code !== '' && code !== '00')
    );
  }
}
