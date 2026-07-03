import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import {
  CategoryDocumentUploadSignaturesDto,
  ShopDocumentUploadSignaturesDto,
  SubmitCategoryDocumentsDto,
  SubmitShopDocumentsDto,
  UpdateShopRegistrationTypeDto,
} from '@shops';
import { RateLimit } from '../../observability';
import { ShopsRpcService } from '../shop/shops-rpc.service';

@ApiTags('Shop-Document')
@Controller('shops')
export class ShopDocumentController {
  constructor(private readonly shopsRpcService: ShopsRpcService) {}

  @ApiOperation({ summary: 'Lay danh sach ho so phap ly da nop cua shop hien tai' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':shopId/documents')
  findShopDocuments(@Param('shopId') shopId: string, @CurrentUserId() requesterUserId: string) {
    return this.shopsRpcService.findShopDocuments({
      shopId,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach ho so theo category da nop cua shop hien tai' })
  @ApiBearerAuth('access-token')
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
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @RateLimit({ profile: 'uploadSignature' })
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
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @RateLimit({ profile: 'uploadSignature' })
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
}
