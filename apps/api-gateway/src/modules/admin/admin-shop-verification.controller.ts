import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import {
  AdminShopVerificationDetailResponseDto,
  AdminShopRegistrationDetailResponseDto,
  PendingVerificationShopQueryDto,
  PaginatedPendingVerificationShopResponseDto,
  ReviewShopDocumentDto,
} from '@shops';
import { ShopsRpcService } from '../shop/shops-rpc.service';

@ApiTags('Admin')
@Controller('shops/admin')
export class AdminShopVerificationController {
  constructor(private readonly shopsRpcService: ShopsRpcService) {}

  @ApiOperation({ summary: 'Admin lay danh sach shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach cua hang theo bo loc.',
    type: PaginatedPendingVerificationShopResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Chi admin moi co quyen truy cap.' })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('list-shop')
  findPendingVerification(@Query() query: PendingVerificationShopQueryDto) {
    return this.shopsRpcService.findPendingVerification({
      shopStatus: query.shopStatus,
      registrationType: query.registrationType,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @ApiOperation({ summary: 'Admin lay chi tiet verification cua mot shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: AdminShopVerificationDetailResponseDto })
  @ApiForbiddenResponse({ description: 'Chi admin moi co quyen truy cap.' })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get(':shopId/verification-detail')
  getAdminVerificationDetail(@Param('shopId') shopId: string) {
    return this.shopsRpcService.getAdminVerificationDetail({ shopId });
  }

  @ApiOperation({ summary: 'Admin lay chi tiet thong tin dang ky cua mot shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: AdminShopRegistrationDetailResponseDto })
  @ApiForbiddenResponse({ description: 'Chi admin moi co quyen truy cap.' })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get(':shopId/registration-detail')
  getAdminRegistrationDetail(@Param('shopId') shopId: string) {
    return this.shopsRpcService.getAdminRegistrationDetail({ shopId });
  }

  @ApiOperation({ summary: 'Admin duyet ho so dang ky cua shop va KYC chu shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        message: 'Đã xử lý hồ sơ đăng ký shop.',
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Chi admin moi co quyen truy cap.' })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post(':shopId/documents/review')
  reviewShopDocument(
    @Param('shopId') shopId: string,
    @CurrentUserId() reviewerUserId: string,
    @Body() dto: ReviewShopDocumentDto,
  ) {
    return this.shopsRpcService.reviewShopDocument({
      shopId,
      reviewerUserId,
      reviewStatus: dto.reviewStatus,
      reviewNote: dto.reviewNote ?? null,
    });
  }

}
