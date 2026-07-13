import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserId,
  ActiveUserGuard,
  JwtAuthGuard,
} from '@security';
import type { AuthenticatedUser } from '@contracts';
import {
  PaginatedWalletLedgerResponseDto,
  WalletResponseDto,
  WalletTransactionsQueryDto,
} from '@wallet';
import { WalletRpcService } from './wallet-rpc.service';

@ApiTags('Wallet')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, ActiveUserGuard)
@Controller()
export class WalletController {
  constructor(private readonly walletRpcService: WalletRpcService) {}

  @ApiOperation({ summary: 'Lay vi VND cua user hien tai' })
  @ApiOkResponse({ type: WalletResponseDto })
  @Get('wallet/me')
  getMyWallet(@CurrentUserId() userId: string) {
    return this.walletRpcService.getMyWallet({ userId });
  }

  @ApiOperation({ summary: 'Lay lich su giao dich vi user hien tai' })
  @ApiOkResponse({ type: PaginatedWalletLedgerResponseDto })
  @Get('wallet/me/transactions')
  getMyWalletTransactions(
    @CurrentUserId() userId: string,
    @Query() query: WalletTransactionsQueryDto,
  ) {
    return this.walletRpcService.getMyWalletTransactions({
      userId,
      page: query.page,
      limit: query.limit,
    });
  }

  @ApiOperation({ summary: 'Lay vi VND cua shop neu la chu shop hoac admin' })
  @ApiOkResponse({ type: WalletResponseDto })
  @Get('shops/:shopId/wallet')
  getShopWallet(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.walletRpcService.getShopWallet({
      shopId,
      requesterUserId,
      requesterRole: requester?.role ?? 'user',
    });
  }

  @ApiOperation({
    summary: 'Lay lich su giao dich vi shop neu la chu shop hoac admin',
  })
  @ApiOkResponse({ type: PaginatedWalletLedgerResponseDto })
  @Get('shops/:shopId/wallet/transactions')
  getShopWalletTransactions(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
    @Query() query: WalletTransactionsQueryDto,
  ) {
    return this.walletRpcService.getShopWalletTransactions({
      shopId,
      requesterUserId,
      requesterRole: requester?.role ?? 'user',
      page: query.page,
      limit: query.limit,
    });
  }
}
