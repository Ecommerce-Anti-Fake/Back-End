import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { PayOSWebhookMessage } from '@contracts';
import { RateLimit } from '../../observability';
import { WalletRpcService } from './wallet-rpc.service';

const PAYOS_RETURN_QUERY_KEYS = ['code', 'id', 'cancel', 'status', 'orderCode'] as const;

@Controller('wallet/top-ups')
export class WalletTopUpWebhookController {
  constructor(private readonly walletRpcService: WalletRpcService, private readonly configService: ConfigService) {}

  @Get('payos/return')
  handleReturn(
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() response: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:5173';
    const target = new URL(`${frontendUrl.replace(/\/$/, '')}/profile/wallet`);
    target.searchParams.set('topUp', this.isFailedPayOSReturn(query) ? 'cancelled' : 'returned');
    for (const key of PAYOS_RETURN_QUERY_KEYS) {
      const value = query[key];
      if (typeof value === 'string' && value.trim()) target.searchParams.set(key, value);
    }
    response.redirect(302, target.toString());
  }

  @RateLimit({ profile: 'paymentWebhook' })
  @Post('payos/webhook')
  handle(@Body() payload: PayOSWebhookMessage) {
    return this.walletRpcService.handleWalletTopUpWebhook(payload);
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
