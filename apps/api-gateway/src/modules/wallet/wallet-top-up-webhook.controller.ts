import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { PayOSWebhookMessage } from '@contracts';
import { RateLimit } from '../../observability';
import { WalletRpcService } from './wallet-rpc.service';

@Controller('wallet/top-ups')
export class WalletTopUpWebhookController {
  constructor(private readonly walletRpcService: WalletRpcService, private readonly configService: ConfigService) {}

  @Get('payos/return')
  handleReturn(@Res() response: Response) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:5173';
    response.redirect(302, `${frontendUrl.replace(/\/$/, '')}/profile/wallet?topUp=returned`);
  }

  @RateLimit({ profile: 'paymentWebhook' })
  @Post('payos/webhook')
  handle(@Body() payload: PayOSWebhookMessage) {
    return this.walletRpcService.handleWalletTopUpWebhook(payload);
  }
}
