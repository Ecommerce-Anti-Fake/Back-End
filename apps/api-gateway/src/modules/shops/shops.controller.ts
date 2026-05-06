import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  BrandAuthorizationResponseDto,
  CategoryDocumentUploadSignaturesDto,
  CreateShopDto,
  AdminShopVerificationDetailResponseDto,
  MediaUploadSignatureResponseDto,
  PaginatedPendingVerificationShopResponseDto,
  PendingVerificationShopQueryDto,
  ReviewShopCategoryDto,
  ReviewBrandAuthorizationDto,
  ReviewShopDocumentDto,
  ShopCategoryDocumentResponseDto,
  ShopDocumentUploadSignaturesDto,
  ShopDocumentResponseDto,
  ShopResponseDto,
  ShopVerificationSummaryResponseDto,
  SubmitCategoryDocumentsDto,
  SubmitBrandAuthorizationDto,
  SubmitShopDocumentsDto,
  UpdateShopRegistrationTypeDto,
  UpdateShopProfileDto,
} from '@shops';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import { ShopsRpcService } from './shops-rpc.service';

@ApiTags('Shops')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsRpcService: ShopsRpcService) {}

  @ApiOperation({ summary: 'Tao shop moi cho user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao shop thanh cong.',
    type: ShopResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Du lieu shop khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post()
  create(@CurrentUserId() ownerUserId: string, @Body() dto: CreateShopDto) {
    return this.shopsRpcService.create({
      ownerUserId,
      shopName: dto.shopName,
      registrationType: dto.registrationType,
      businessType: dto.businessType,
      taxCode: dto.taxCode ?? null,
      categoryIds: dto.categoryIds,
    });
  }

  @ApiOperation({ summary: 'Cap nhat ho so co ban cua shop hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Cap nhat ho so shop thanh cong.',
    type: ShopResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Du lieu cap nhat khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Shop khong thuoc user hien tai.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch(':shopId/profile')
  updateProfile(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: UpdateShopProfileDto,
  ) {
    return this.shopsRpcService.updateProfile({
      shopId,
      requesterUserId,
      shopName: dto.shopName,
      businessType: dto.businessType,
      taxCode: dto.taxCode,
    });
  }

  @ApiOperation({ summary: 'Yeu cau doi loai tai khoan gian hang' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Cap nhat loai shop thanh cong, trang thai verification duoc tinh lai.',
    type: ShopResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Shop khong thuoc user hien tai.',
  })
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

  @ApiOperation({ summary: 'Lay danh sach shop cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach shop user dang so huu.',
    type: ShopResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('mine')
  findMine(@CurrentUserId() ownerUserId: string) {
    return this.shopsRpcService.findMine({ ownerUserId });
  }

  @ApiOperation({ summary: 'Admin lay danh sach shop dang cho verification' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach shop dang pending_verification.',
    type: PaginatedPendingVerificationShopResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Chi admin moi co quyen truy cap.' })
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
  @ApiOkResponse({
    description: 'Chi tiet verification cua shop.',
    type: AdminShopVerificationDetailResponseDto,
  })
  @ApiForbiddenResponse({ description: 'Chi admin moi co quyen truy cap.' })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/:shopId/verification-detail')
  getAdminVerificationDetail(@Param('shopId') shopId: string) {
    return this.shopsRpcService.getAdminVerificationDetail({ shopId });
  }

  @ApiOperation({ summary: 'Lay thong tin chi tiet mot shop' })
  @ApiParam({ name: 'id', description: 'ID shop can xem.' })
  @ApiOkResponse({
    description: 'Thong tin chi tiet shop.',
    type: ShopResponseDto,
  })
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.shopsRpcService.findById({ id });
  }

  @ApiOperation({ summary: 'Lay tong quan trang thai verification cua shop hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: ShopVerificationSummaryResponseDto })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':shopId/verification-summary')
  getVerificationSummary(@Param('shopId') shopId: string, @CurrentUserId() requesterUserId: string) {
    return this.shopsRpcService.getVerificationSummary({
      shopId,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach ho so phap ly da nop cua shop hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: ShopDocumentResponseDto, isArray: true })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':shopId/documents')
  findShopDocuments(@Param('shopId') shopId: string, @CurrentUserId() requesterUserId: string) {
    return this.shopsRpcService.findShopDocuments({
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

  @ApiOperation({ summary: 'Lay danh sach ho so theo category da nop cua shop hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: ShopCategoryDocumentResponseDto, isArray: true })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':shopId/categories/:categoryId/documents')
  findCategoryDocuments(
    @Param('shopId') shopId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUserId() requesterUserId: string,
  ) {
    return this.shopsRpcService.findCategoryDocuments({
      shopId,
      categoryId,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Lay chu ky upload ho so phap ly cua shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: MediaUploadSignatureResponseDto, isArray: true })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':shopId/documents/upload-signatures')
  getShopDocumentUploadSignatures(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: ShopDocumentUploadSignaturesDto,
  ) {
    return this.shopsRpcService.getShopDocumentUploadSignatures({
      shopId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Nop ho so phap ly cua shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: ShopResponseDto })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':shopId/documents')
  submitShopDocuments(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: SubmitShopDocumentsDto,
  ) {
    return this.shopsRpcService.submitShopDocuments({
      shopId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Lay chu ky upload ho so theo danh muc nganh hang cua shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: MediaUploadSignatureResponseDto, isArray: true })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':shopId/categories/:categoryId/documents/upload-signatures')
  getCategoryDocumentUploadSignatures(
    @Param('shopId') shopId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: CategoryDocumentUploadSignaturesDto,
  ) {
    return this.shopsRpcService.getCategoryDocumentUploadSignatures({
      shopId,
      categoryId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Nop ho so theo danh muc nganh hang cua shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: ShopResponseDto })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':shopId/categories/:categoryId/documents')
  submitCategoryDocuments(
    @Param('shopId') shopId: string,
    @Param('categoryId') categoryId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: SubmitCategoryDocumentsDto,
  ) {
    return this.shopsRpcService.submitCategoryDocuments({
      shopId,
      categoryId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Lay chu ky upload ho so uy quyen brand cua shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: MediaUploadSignatureResponseDto, isArray: true })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':shopId/brands/:brandId/authorization/upload-signatures')
  getBrandAuthorizationUploadSignatures(
    @Param('shopId') shopId: string,
    @Param('brandId') brandId: string,
    @CurrentUserId() requesterUserId: string,
  ) {
    return this.shopsRpcService.getBrandAuthorizationUploadSignatures({
      shopId,
      brandId,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Nop ho so uy quyen brand cua shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: BrandAuthorizationResponseDto })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':shopId/brands/:brandId/authorization')
  submitBrandAuthorization(
    @Param('shopId') shopId: string,
    @Param('brandId') brandId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: SubmitBrandAuthorizationDto,
  ) {
    return this.shopsRpcService.submitBrandAuthorization({
      shopId,
      brandId,
      requesterUserId,
      authorizationType: dto.authorizationType,
      mimeType: dto.mimeType,
      fileUrl: dto.fileUrl,
      publicId: dto.publicId,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach ho so uy quyen brand cua shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: BrandAuthorizationResponseDto, isArray: true })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':shopId/brand-authorizations')
  findBrandAuthorizations(@Param('shopId') shopId: string, @CurrentUserId() requesterUserId: string) {
    return this.shopsRpcService.findBrandAuthorizations({
      shopId,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Admin duyet ho so phap ly cua shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: ShopResponseDto })
  @ApiForbiddenResponse({ description: 'Chi admin moi co quyen duyet.' })
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
  @ApiOkResponse({ type: ShopResponseDto })
  @ApiForbiddenResponse({ description: 'Chi admin moi co quyen duyet.' })
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
  @ApiOkResponse({ type: BrandAuthorizationResponseDto })
  @ApiForbiddenResponse({ description: 'Chi admin moi co quyen duyet.' })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/brand-authorizations')
  findAdminBrandAuthorizations(@Query('verificationStatus') verificationStatus?: 'pending' | 'approved' | 'rejected') {
    return this.shopsRpcService.findAdminBrandAuthorizations({
      verificationStatus,
    });
  }

  @ApiOperation({ summary: 'Admin duyet ho so uy quyen brand cua shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: BrandAuthorizationResponseDto })
  @ApiForbiddenResponse({ description: 'Chi admin moi co quyen duyet.' })
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
