import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUser, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import type { AuthenticatedUser } from '@contracts';
import {
  AdjustWalletBalanceDto,
  AdminPayoutAccountsQueryDto,
  CompleteWalletWithdrawalDto,
  CreatePayoutAccountDto,
  CreateWalletTopUpDto,
  CreateWalletWithdrawalDto,
  CreateWithdrawalAuthorizationChallengeDto,
  PaginatedWalletLedgerResponseDto,
  PayoutAccountAuthorizationDto,
  PayoutAccountResponseDto,
  ReasonDto,
  VerifyPayoutAccountDto,
  VerifyWithdrawalAuthorizationChallengeDto,
  WalletReconciliationQueryDto,
  WalletResponseDto,
  WalletTopUpResponseDto,
  WalletTransactionsQueryDto,
  WalletWithdrawalResponseDto,
  WalletWithdrawalsQueryDto,
} from '@wallet';
import { WalletRpcService } from './wallet-rpc.service';

@ApiTags('Wallet')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, ActiveUserGuard)
@Controller()
export class WalletController {
  constructor(private readonly walletRpcService: WalletRpcService) {}

  @ApiOperation({ summary: 'Lấy ví VND của người dùng hiện tại' })
  @ApiOkResponse({ type: WalletResponseDto })
  @Get('wallet/me')
  getMyWallet(@CurrentUserId() userId: string) {
    return this.walletRpcService.getMyWallet({ userId });
  }

  @ApiOperation({ summary: 'Lấy lịch sử giao dịch ví người dùng hiện tại' })
  @ApiOkResponse({ type: PaginatedWalletLedgerResponseDto })
  @Get('wallet/me/transactions')
  getMyWalletTransactions(@CurrentUserId() userId: string, @Query() query: WalletTransactionsQueryDto) {
    return this.walletRpcService.getMyWalletTransactions({ userId, page: query.page, limit: query.limit });
  }

  @ApiOperation({ summary: 'Tạo liên kết nạp tiền vào ví người dùng' })
  @ApiOkResponse({ type: WalletTopUpResponseDto })
  @Post('wallet/me/top-ups')
  createWalletTopUp(@CurrentUserId() userId: string, @Body() body: CreateWalletTopUpDto) {
    return this.walletRpcService.createWalletTopUp({ userId, amount: body.amount, idempotencyKey: body.idempotencyKey ?? '' });
  }

  @ApiOperation({ summary: 'Lấy các tài khoản nhận tiền của người dùng' })
  @ApiOkResponse({ type: PayoutAccountResponseDto, isArray: true })
  @Get('wallet/me/payout-accounts')
  listMyPayoutAccounts(@CurrentUserId() userId: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.walletRpcService.listPayoutAccounts({ userId, requesterRole: user?.role ?? 'user' });
  }

  @ApiOperation({ summary: 'Thêm tài khoản nhận tiền của người dùng sau xác thực bước hai' })
  @ApiOkResponse({ type: PayoutAccountResponseDto })
  @Post('wallet/me/payout-accounts')
  createMyPayoutAccount(
    @CurrentUserId() userId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: CreatePayoutAccountDto,
  ) {
    return this.walletRpcService.createPayoutAccount({ userId, requesterRole: user?.role ?? 'user', ...body });
  }

  @ApiOperation({ summary: 'Vô hiệu hóa tài khoản nhận tiền của người dùng' })
  @Delete('wallet/me/payout-accounts/:id')
  disableMyPayoutAccount(
    @Param('id') payoutAccountId: string,
    @CurrentUserId() userId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: PayoutAccountAuthorizationDto,
  ) {
    return this.walletRpcService.disablePayoutAccount({
      payoutAccountId, userId, requesterRole: user?.role ?? 'user', authorizationToken: body.authorizationToken,
    });
  }

  @ApiOperation({ summary: 'Tạo yêu cầu rút tiền của người dùng (đang tắt mặc định)' })
  @ApiOkResponse({ type: WalletWithdrawalResponseDto })
  @Post('wallet/me/withdrawals')
  requestMyWalletWithdrawal(
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: CreateWalletWithdrawalDto,
  ) {
    return this.walletRpcService.requestUserWalletWithdrawal({
      requesterUserId, requesterRole: user?.role ?? 'user', ...body,
    });
  }

  @ApiOperation({ summary: 'Tạo thử thách xác thực Firebase cho thao tác rút tiền' })
  @Post('wallet/withdrawal-authorizations/challenges')
  createWithdrawalAuthorizationChallenge(
    @CurrentUserId() userId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: CreateWithdrawalAuthorizationChallengeDto,
  ) {
    return this.walletRpcService.createWithdrawalAuthorizationChallenge({
      userId, requesterRole: user?.role ?? 'user', ...body,
    });
  }

  @ApiOperation({ summary: 'Đổi bằng chứng Firebase mới thành token thao tác một lần' })
  @Post('wallet/withdrawal-authorizations/challenges/:id/verify')
  verifyWithdrawalAuthorizationChallenge(
    @Param('id') challengeId: string,
    @CurrentUserId() userId: string,
    @Body() body: VerifyWithdrawalAuthorizationChallengeDto,
  ) {
    return this.walletRpcService.verifyWithdrawalAuthorizationChallenge({ challengeId, userId, ...body });
  }

  @ApiOperation({ summary: 'Lấy ví VND của shop nếu là chủ shop hoặc admin' })
  @ApiOkResponse({ type: WalletResponseDto })
  @Get('shops/:shopId/wallet')
  getShopWallet(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.walletRpcService.getShopWallet({ shopId, requesterUserId, requesterRole: requester?.role ?? 'user' });
  }

  @ApiOperation({ summary: 'Lấy lịch sử giao dịch ví shop' })
  @ApiOkResponse({ type: PaginatedWalletLedgerResponseDto })
  @Get('shops/:shopId/wallet/transactions')
  getShopWalletTransactions(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
    @Query() query: WalletTransactionsQueryDto,
  ) {
    return this.walletRpcService.getShopWalletTransactions({
      shopId, requesterUserId, requesterRole: requester?.role ?? 'user', page: query.page, limit: query.limit,
    });
  }

  @ApiOperation({ summary: 'Lấy các tài khoản nhận tiền của shop' })
  @ApiOkResponse({ type: PayoutAccountResponseDto, isArray: true })
  @Get('shops/:shopId/wallet/payout-accounts')
  listShopPayoutAccounts(
    @Param('shopId') shopId: string,
    @CurrentUserId() userId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.walletRpcService.listPayoutAccounts({ shopId, userId, requesterRole: user?.role ?? 'user' });
  }

  @ApiOperation({ summary: 'Thêm tài khoản nhận tiền của shop sau xác thực bước hai' })
  @ApiOkResponse({ type: PayoutAccountResponseDto })
  @Post('shops/:shopId/wallet/payout-accounts')
  createShopPayoutAccount(
    @Param('shopId') shopId: string,
    @CurrentUserId() userId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: CreatePayoutAccountDto,
  ) {
    return this.walletRpcService.createPayoutAccount({ shopId, userId, requesterRole: user?.role ?? 'user', ...body });
  }

  @ApiOperation({ summary: 'Vô hiệu hóa tài khoản nhận tiền của shop' })
  @Delete('shops/:shopId/wallet/payout-accounts/:id')
  disableShopPayoutAccount(
    @Param('shopId') shopId: string,
    @Param('id') payoutAccountId: string,
    @CurrentUserId() userId: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() body: PayoutAccountAuthorizationDto,
  ) {
    return this.walletRpcService.disablePayoutAccount({
      shopId, payoutAccountId, userId, requesterRole: user?.role ?? 'user', authorizationToken: body.authorizationToken,
    });
  }

  @ApiOperation({ summary: 'Tạo yêu cầu rút tiền của shop' })
  @ApiOkResponse({ type: WalletWithdrawalResponseDto })
  @Post('shops/:shopId/wallet/withdrawals')
  requestShopWalletWithdrawal(
    @Param('shopId') shopId: string,
    @Body() body: CreateWalletWithdrawalDto,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.walletRpcService.requestShopWalletWithdrawal({
      shopId, requesterUserId, requesterRole: requester?.role ?? 'user', ...body,
    });
  }

  @ApiOperation({ summary: 'Lấy danh sách yêu cầu rút tiền của shop' })
  @ApiOkResponse({ type: WalletWithdrawalResponseDto, isArray: true })
  @Get('shops/:shopId/wallet/withdrawals')
  listShopWalletWithdrawals(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.walletRpcService.listShopWalletWithdrawals({
      shopId, requesterUserId, requesterRole: requester?.role ?? 'user',
    });
  }

  @ApiOperation({ summary: 'Hủy yêu cầu rút tiền đang chờ của shop' })
  @Post('shops/:shopId/wallet/withdrawals/:id/cancel')
  cancelShopWalletWithdrawal(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.walletRpcService.cancelWalletWithdrawal({
      id, shopId, requesterUserId, requesterRole: requester?.role ?? 'user',
    });
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/wallets/platform')
  getPlatformWallets() { return this.walletRpcService.getPlatformWallets(); }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/wallets/reconciliation')
  getWalletReconciliation(@Query() query: WalletReconciliationQueryDto) {
    return this.walletRpcService.getWalletReconciliation(query);
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/wallet-withdrawals')
  listAdminWalletWithdrawals(@Query() query: WalletWithdrawalsQueryDto) {
    return this.walletRpcService.listAdminWalletWithdrawals({ page: query.page, limit: query.limit, status: query.status });
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/wallet-withdrawals/:id/approve')
  approveWalletWithdrawal(@Param('id') id: string, @CurrentUserId() adminUserId: string) {
    return this.walletRpcService.approveWalletWithdrawal({ id, adminUserId });
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/wallet-withdrawals/:id/complete')
  completeWalletWithdrawal(
    @Param('id') id: string,
    @CurrentUserId() adminUserId: string,
    @Body() body: CompleteWalletWithdrawalDto,
  ) {
    return this.walletRpcService.completeWalletWithdrawal({ id, adminUserId, transferReference: body.transferReference });
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/wallet-withdrawals/:id/reject')
  rejectWalletWithdrawal(
    @Param('id') id: string,
    @CurrentUserId() adminUserId: string,
    @Body() body: ReasonDto,
  ) {
    return this.walletRpcService.rejectWalletWithdrawal({ id, adminUserId, reason: body.reason });
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/wallet-withdrawals/:id/reveal')
  revealWithdrawalAccount(
    @Param('id') withdrawalId: string,
    @CurrentUserId() adminUserId: string,
    @Body() body: ReasonDto,
  ) {
    return this.walletRpcService.revealWithdrawalAccount({ withdrawalId, adminUserId, reason: body.reason });
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/wallet/payout-accounts')
  listAdminPayoutAccounts(@Query() query: AdminPayoutAccountsQueryDto) {
    return this.walletRpcService.listAdminPayoutAccounts({ status: query.status });
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/wallet/payout-accounts/:id/verify')
  verifyPayoutAccount(
    @Param('id') payoutAccountId: string,
    @CurrentUserId() adminUserId: string,
    @Body() body: VerifyPayoutAccountDto,
  ) {
    return this.walletRpcService.verifyPayoutAccount({ payoutAccountId, adminUserId, ...body });
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/wallet/payout-accounts/:id/reject')
  rejectPayoutAccount(
    @Param('id') payoutAccountId: string,
    @CurrentUserId() adminUserId: string,
    @Body() body: ReasonDto,
  ) {
    return this.walletRpcService.rejectPayoutAccount({ payoutAccountId, adminUserId, reason: body.reason });
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/wallet/payout-accounts/:id/reveal')
  revealPayoutAccount(
    @Param('id') payoutAccountId: string,
    @CurrentUserId() adminUserId: string,
    @Body() body: ReasonDto,
  ) {
    return this.walletRpcService.revealPayoutAccount({ payoutAccountId, adminUserId, reason: body.reason });
  }

  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/wallets/:walletId/adjustments')
  adjustWalletBalance(
    @Param('walletId') walletId: string,
    @CurrentUserId() adminUserId: string,
    @Body() body: AdjustWalletBalanceDto,
  ) {
    return this.walletRpcService.adjustWalletBalance({ walletId, adminUserId, ...body });
  }
}
