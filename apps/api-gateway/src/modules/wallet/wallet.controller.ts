import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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
  Roles,
  RolesGuard,
} from '@security';
import type { AuthenticatedUser } from '@contracts';
import {
  PaginatedWalletLedgerResponseDto,
  WalletResponseDto,
  WalletTransactionsQueryDto,
  CreateWalletWithdrawalDto, AdjustWalletBalanceDto,
  WalletWithdrawalResponseDto,
  CreateWalletTopUpDto, WalletTopUpResponseDto, WalletReconciliationQueryDto, WalletWithdrawalsQueryDto,
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

  @ApiOperation({ summary: 'Tao link nap tien vao vi user' })
  @ApiOkResponse({ type: WalletTopUpResponseDto })
  @Post('wallet/me/top-ups')
  createWalletTopUp(@CurrentUserId() userId: string, @Body() body: CreateWalletTopUpDto) {
    return this.walletRpcService.createWalletTopUp({ userId, amount: body.amount, idempotencyKey: body.idempotencyKey ?? '' });
  }

  @ApiOperation({ summary: 'Admin xem cac vi platform' })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/wallets/platform')
  getPlatformWallets() {
    return this.walletRpcService.getPlatformWallets();
  }

  @ApiOperation({ summary: 'Admin xem ledger va doi soat wallet' })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/wallets/reconciliation')
  getWalletReconciliation(@Query() query: WalletReconciliationQueryDto) {
    return this.walletRpcService.getWalletReconciliation(query);
  }

  @ApiOperation({ summary: 'Admin xem danh sach yeu cau rut tien' })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/wallet-withdrawals')
  listAdminWalletWithdrawals(@Query() query: WalletWithdrawalsQueryDto) {
    return this.walletRpcService.listAdminWalletWithdrawals({ page: query.page, limit: query.limit, status: query.status });
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

  @ApiOperation({ summary: 'Tao yeu cau rut tien cua shop' })
  @ApiOkResponse({ type: WalletWithdrawalResponseDto })
  @Post('shops/:shopId/wallet/withdrawals')
  requestShopWalletWithdrawal(
    @Param('shopId') shopId: string,
    @Body() body: CreateWalletWithdrawalDto,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.walletRpcService.requestShopWalletWithdrawal({
      shopId,
      requesterUserId,
      requesterRole: requester?.role ?? 'user',
      ...body,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach yeu cau rut tien cua shop' })
  @ApiOkResponse({ type: WalletWithdrawalResponseDto, isArray: true })
  @Get('shops/:shopId/wallet/withdrawals')
  listShopWalletWithdrawals(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.walletRpcService.listShopWalletWithdrawals({
      shopId,
      requesterUserId,
      requesterRole: requester?.role ?? 'user',
    });
  }

  @ApiOperation({ summary: 'Admin duyet yeu cau rut tien' })
  @ApiOkResponse({ schema: { example: { success: true, message: 'Xử lý yêu cầu rút tiền thành công.' } } })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/wallet-withdrawals/:id/approve')
  approveWalletWithdrawal(@Param('id') id: string) {
    return this.walletRpcService.approveWalletWithdrawal({ id });
  }

  @ApiOperation({ summary: 'Admin tu choi yeu cau rut tien' })
  @ApiOkResponse({ schema: { example: { success: true, message: 'Xử lý yêu cầu rút tiền thành công.' } } })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/wallet-withdrawals/:id/reject')
  rejectWalletWithdrawal(@Param('id') id: string) {
    return this.walletRpcService.rejectWalletWithdrawal({ id });
  }

  @ApiOperation({ summary: 'Admin dieu chinh so du vi' })
  @ApiOkResponse({ schema: { example: { success: true, message: 'Điều chỉnh số dư ví thành công.' } } })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/wallets/:walletId/adjustments')
  adjustWalletBalance(@Param('walletId') walletId: string, @CurrentUserId() adminUserId: string, @Body() body: AdjustWalletBalanceDto) {
    return this.walletRpcService.adjustWalletBalance({ walletId, adminUserId, ...body });
  }
}
