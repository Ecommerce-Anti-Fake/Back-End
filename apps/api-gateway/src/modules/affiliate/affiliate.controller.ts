import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AffiliateAccountResponseDto,
  AffiliateAccountSummaryResponseDto,
  AffiliateCodeResponseDto,
  AffiliateCommissionEntryResponseDto,
  AffiliateConversionResponseDto,
  AffiliatePayoutResponseDto,
  AffiliateProgramResponseDto,
  ApproveAffiliateConversionDto,
  CreateAffiliateCodeDto,
  CreateAffiliatePayoutDto,
  CreateAffiliateProgramDto,
  JoinAffiliateProgramDto,
  RejectAffiliateConversionDto,
  UpdateAffiliatePayoutStatusDto,
} from '@affiliate';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import { AffiliateRpcService } from './affiliate-rpc.service';

@ApiTags('Affiliate')
@Controller('affiliate')
export class AffiliateController {
  constructor(private readonly affiliateRpcService: AffiliateRpcService) {}

  @ApiOperation({ summary: 'Tao affiliate program cho shop hien tai' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ description: 'Tao affiliate program thanh cong.', type: AffiliateProgramResponseDto })
  @ApiBadRequestResponse({ description: 'Affiliate program khong hop le hoac resource scope khong dung.' })
  @ApiUnauthorizedResponse({ description: 'Thieu access token hoac token khong hop le.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('programs')
  createProgram(@CurrentUserId() requesterUserId: string, @Body() dto: CreateAffiliateProgramDto) {
    return this.affiliateRpcService.createProgram({
      requesterUserId,
      ownerShopId: dto.ownerShopId ?? null,
      brandId: dto.brandId ?? null,
      productModelId: dto.productModelId ?? null,
      offerId: dto.offerId ?? null,
      scopeType: dto.scopeType,
      name: dto.name,
      slug: dto.slug,
      attributionWindowDays: dto.attributionWindowDays,
      commissionModel: dto.commissionModel,
      tier1Rate: dto.tier1Rate,
      tier2Rate: dto.tier2Rate,
      rulesJson: dto.rulesJson ?? null,
      startedAt: dto.startedAt ?? null,
      endedAt: dto.endedAt ?? null,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach affiliate program do user so huu' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Danh sach affiliate program cua user hien tai.', type: AffiliateProgramResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Thieu access token hoac token khong hop le.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('programs/mine')
  findMyPrograms(@CurrentUserId() requesterUserId: string) {
    return this.affiliateRpcService.findMyPrograms({ requesterUserId });
  }

  @ApiOperation({ summary: 'Tham gia mot affiliate program bang referral code hoac join truc tiep' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ description: 'Tham gia affiliate program thanh cong.', type: AffiliateAccountResponseDto })
  @ApiBadRequestResponse({ description: 'Program khong active, referral code sai, hoac user da tham gia roi.' })
  @ApiUnauthorizedResponse({ description: 'Thieu access token hoac token khong hop le.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('accounts/join')
  joinProgram(@CurrentUserId() requesterUserId: string, @Body() dto: JoinAffiliateProgramDto) {
    return this.affiliateRpcService.joinProgram({
      requesterUserId,
      programId: dto.programId,
      referralCode: dto.referralCode ?? null,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach affiliate account cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Danh sach affiliate account cua user.', type: AffiliateAccountResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Thieu access token hoac token khong hop le.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('accounts/mine')
  findMyAccounts(@CurrentUserId() requesterUserId: string) {
    return this.affiliateRpcService.findMyAccounts({ requesterUserId });
  }

  @ApiOperation({ summary: 'Lay tong quan hieu suat affiliate cua mot account cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'accountId', description: 'ID affiliate account.' })
  @ApiOkResponse({ description: 'Thong tin tong quan affiliate account.', type: AffiliateAccountSummaryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Thieu access token hoac token khong hop le.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('accounts/:accountId/summary')
  getAccountSummary(@CurrentUserId() requesterUserId: string, @Param('accountId') accountId: string) {
    return this.affiliateRpcService.getAccountSummary({ requesterUserId, accountId });
  }

  @ApiOperation({ summary: 'Lay danh sach conversion cua mot affiliate account cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'accountId', description: 'ID affiliate account.' })
  @ApiOkResponse({ description: 'Danh sach conversion cua account.', type: AffiliateConversionResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Thieu access token hoac token khong hop le.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('accounts/:accountId/conversions')
  findConversionsByAccount(@CurrentUserId() requesterUserId: string, @Param('accountId') accountId: string) {
    return this.affiliateRpcService.findConversionsByAccount({ requesterUserId, accountId });
  }

  @ApiOperation({ summary: 'Tao affiliate code cho account cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ description: 'Tao affiliate code thanh cong.', type: AffiliateCodeResponseDto })
  @ApiBadRequestResponse({ description: 'Affiliate account khong hop le, code bi trung, hoac account chua active.' })
  @ApiUnauthorizedResponse({ description: 'Thieu access token hoac token khong hop le.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('codes')
  createCode(@CurrentUserId() requesterUserId: string, @Body() dto: CreateAffiliateCodeDto) {
    return this.affiliateRpcService.createCode({
      requesterUserId,
      accountId: dto.accountId,
      code: dto.code,
      landingUrl: dto.landingUrl ?? null,
      isDefault: dto.isDefault,
      expiresAt: dto.expiresAt ?? null,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach affiliate code theo account cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'accountId', description: 'ID affiliate account.' })
  @ApiOkResponse({ description: 'Danh sach affiliate code cua account.', type: AffiliateCodeResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Thieu access token hoac token khong hop le.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('accounts/:accountId/codes')
  findCodesByAccount(@CurrentUserId() requesterUserId: string, @Param('accountId') accountId: string) {
    return this.affiliateRpcService.findCodesByAccount({ requesterUserId, accountId });
  }

  @ApiOperation({ summary: 'Lay danh sach commission ledger cua mot account cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'accountId', description: 'ID affiliate account.' })
  @ApiOkResponse({ description: 'Danh sach commission ledger cua account.', type: AffiliateCommissionEntryResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Thieu access token hoac token khong hop le.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('accounts/:accountId/commissions')
  findCommissionsByAccount(@CurrentUserId() requesterUserId: string, @Param('accountId') accountId: string) {
    return this.affiliateRpcService.findCommissionsByAccount({ requesterUserId, accountId });
  }

  @ApiOperation({ summary: 'Lay lich su payout cua mot affiliate account cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'accountId', description: 'ID affiliate account.' })
  @ApiOkResponse({ description: 'Danh sach payout cua account.', type: AffiliatePayoutResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Thieu access token hoac token khong hop le.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('accounts/:accountId/payouts')
  findPayoutsByAccount(@CurrentUserId() requesterUserId: string, @Param('accountId') accountId: string) {
    return this.affiliateRpcService.findPayoutsByAccount({ requesterUserId, accountId });
  }

  @ApiOperation({ summary: 'Lay conversions cua mot affiliate program' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'programId', description: 'ID affiliate program.' })
  @ApiOkResponse({ description: 'Danh sach conversions cua program.', type: AffiliateConversionResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Thieu access token hoac token khong hop le.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('programs/:programId/conversions')
  findConversionsByProgram(@CurrentUserId() requesterUserId: string, @Param('programId') programId: string) {
    return this.affiliateRpcService.findConversionsByProgram({ requesterUserId, programId });
  }

  @ApiOperation({ summary: 'Approve mot affiliate conversion' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ description: 'Approve conversion thanh cong.', type: AffiliateConversionResponseDto })
  @ApiBadRequestResponse({ description: 'Conversion khong hop le hoac khong o trang thai pending.' })
  @ApiUnauthorizedResponse({ description: 'Thieu access token hoac token khong hop le.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('conversions/approve')
  approveConversion(@CurrentUserId() requesterUserId: string, @Body() dto: ApproveAffiliateConversionDto) {
    return this.affiliateRpcService.approveConversion({ requesterUserId, conversionId: dto.conversionId });
  }

  @ApiOperation({ summary: 'Reject mot affiliate conversion' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ description: 'Reject conversion thanh cong.', type: AffiliateConversionResponseDto })
  @ApiBadRequestResponse({ description: 'Conversion khong hop le hoac khong o trang thai pending.' })
  @ApiUnauthorizedResponse({ description: 'Thieu access token hoac token khong hop le.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('conversions/reject')
  rejectConversion(@CurrentUserId() requesterUserId: string, @Body() dto: RejectAffiliateConversionDto) {
    return this.affiliateRpcService.rejectConversion({ requesterUserId, conversionId: dto.conversionId });
  }

  @ApiOperation({ summary: 'Tao payout cho mot affiliate account trong program' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ description: 'Tao payout thanh cong.', type: AffiliatePayoutResponseDto })
  @ApiBadRequestResponse({ description: 'Khong co commission approved hop le cho ky payout.' })
  @ApiUnauthorizedResponse({ description: 'Thieu access token hoac token khong hop le.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('payouts')
  createPayout(@CurrentUserId() requesterUserId: string, @Body() dto: CreateAffiliatePayoutDto) {
    return this.affiliateRpcService.createPayout({
      requesterUserId,
      programId: dto.programId,
      accountId: dto.accountId,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      externalRef: dto.externalRef ?? null,
    });
  }

  @ApiOperation({ summary: 'Lay payouts cua mot affiliate program' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'programId', description: 'ID affiliate program.' })
  @ApiOkResponse({ description: 'Danh sach payout cua program.', type: AffiliatePayoutResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Thieu access token hoac token khong hop le.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('programs/:programId/payouts')
  findPayoutsByProgram(@CurrentUserId() requesterUserId: string, @Param('programId') programId: string) {
    return this.affiliateRpcService.findPayoutsByProgram({ requesterUserId, programId });
  }

  @ApiOperation({ summary: 'Cap nhat trang thai payout' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ description: 'Cap nhat payout thanh cong.', type: AffiliatePayoutResponseDto })
  @ApiBadRequestResponse({ description: 'Payout khong hop le hoac dang o terminal status.' })
  @ApiUnauthorizedResponse({ description: 'Thieu access token hoac token khong hop le.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('payouts/status')
  updatePayoutStatus(@CurrentUserId() requesterUserId: string, @Body() dto: UpdateAffiliatePayoutStatusDto) {
    return this.affiliateRpcService.updatePayoutStatus({
      requesterUserId,
      payoutId: dto.payoutId,
      payoutStatus: dto.payoutStatus,
    });
  }
}
