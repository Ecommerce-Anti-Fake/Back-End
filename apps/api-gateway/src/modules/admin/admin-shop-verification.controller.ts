import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import {
  PendingVerificationShopQueryDto,
  ReviewBrandAuthorizationDto,
  ReviewShopCategoryDto,
  ReviewShopDocumentDto,
} from '@shops';
import { ShopsRpcService } from '../shop/shops-rpc.service';

@ApiTags('Admin')
@Controller('shops/admin')
export class AdminShopVerificationController {
  constructor(private readonly shopsRpcService: ShopsRpcService) {}

  @ApiOperation({ summary: 'Admin lay danh sach shop dang cho verification' })
  @ApiBearerAuth('access-token')
  @ApiForbiddenResponse({ description: 'Chi admin moi co quyen truy cap.' })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('pending-verification')
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
  @ApiForbiddenResponse({ description: 'Chi admin moi co quyen truy cap.' })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get(':shopId/verification-detail')
  getAdminVerificationDetail(@Param('shopId') shopId: string) {
    return this.shopsRpcService.getAdminVerificationDetail({ shopId });
  }

  @ApiOperation({ summary: 'Admin duyet ho so phap ly cua shop' })
  @ApiBearerAuth('access-token')
  @ApiForbiddenResponse({ description: 'Chi admin moi co quyen truy cap.' })
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
  @ApiForbiddenResponse({ description: 'Chi admin moi co quyen truy cap.' })
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
  @ApiForbiddenResponse({ description: 'Chi admin moi co quyen truy cap.' })
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
