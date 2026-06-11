import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import {
  PendingVerificationShopQueryDto,
  ReviewBrandAuthorizationDto,
  ReviewShopCategoryDto,
  ReviewShopDocumentDto,
  UpdateShopRegistrationTypeDto,
} from '@shops';
import { ShopsRpcService } from '../shop/shops-rpc.service';

@ApiTags('Verification')
@Controller('shops')
export class VerificationController {
  constructor(private readonly shopsRpcService: ShopsRpcService) {}

  @ApiOperation({ summary: 'Yeu cau doi loai tai khoan gian hang' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch(':shopId/registration-type')
  updateRegistrationType(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: UpdateShopRegistrationTypeDto,
  ) {
    return this.shopsRpcService.updateRegistrationType({
      shopId,
      requesterUserId,
      registrationType: dto.registrationType,
    });
  }

  @ApiOperation({ summary: 'Admin lay danh sach shop dang cho verification' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/pending-verification')
  findPendingVerification(@Query() query: PendingVerificationShopQueryDto) {
    return this.shopsRpcService.findPendingVerification({
      shopStatus: query.shopStatus ?? 'pending_verification',
      registrationType: query.registrationType,
      categoryId: query.categoryId,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @ApiOperation({ summary: 'Admin lay chi tiet verification cua mot shop' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/:shopId/verification-detail')
  getAdminVerificationDetail(@Param('shopId') shopId: string) {
    return this.shopsRpcService.getAdminVerificationDetail({ shopId });
  }

  @ApiOperation({ summary: 'Lay tong quan trang thai verification cua shop hien tai' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':shopId/verification-summary')
  getVerificationSummary(@Param('shopId') shopId: string, @CurrentUserId() requesterUserId: string) {
    return this.shopsRpcService.getVerificationSummary({
      shopId,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Lay checklist ho so can nop theo loai shop' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':shopId/document-requirements')
  findShopDocumentRequirements(@Param('shopId') shopId: string, @CurrentUserId() requesterUserId: string) {
    return this.shopsRpcService.findShopDocumentRequirements({
      shopId,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Admin duyet ho so phap ly cua shop' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post(':shopId/documents/:documentId/review')
  reviewShopDocument(
    @Param('shopId') shopId: string,
    @Param('documentId') documentId: string,
    @CurrentUserId() reviewerUserId: string,
    @Body() dto: ReviewShopDocumentDto,
  ) {
    return this.shopsRpcService.reviewShopDocument({
      shopId,
      documentId,
      reviewerUserId,
      reviewStatus: dto.reviewStatus,
      reviewNote: dto.reviewNote ?? null,
    });
  }

  @ApiOperation({ summary: 'Admin duyet category registration cua shop' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post(':shopId/categories/:categoryId/review')
  reviewShopCategory(
    @Param('shopId') shopId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUserId() reviewerUserId: string,
    @Body() dto: ReviewShopCategoryDto,
  ) {
    return this.shopsRpcService.reviewShopCategory({
      shopId,
      categoryId,
      reviewerUserId,
      registrationStatus: dto.registrationStatus,
      reviewNote: dto.reviewNote ?? null,
    });
  }

  @ApiOperation({ summary: 'Admin duyet ho so uy quyen brand cua shop' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('brand-authorizations/:authorizationId/review')
  reviewBrandAuthorization(
    @Param('authorizationId') authorizationId: string,
    @CurrentUserId() reviewerUserId: string,
    @Body() dto: ReviewBrandAuthorizationDto,
  ) {
    return this.shopsRpcService.reviewBrandAuthorization({
      authorizationId,
      reviewerUserId,
      verificationStatus: dto.verificationStatus,
      reviewNote: dto.reviewNote ?? null,
    });
  }
}
