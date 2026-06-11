import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import {
  CategoryDocumentUploadSignaturesDto,
  ShopDocumentUploadSignaturesDto,
  SubmitCategoryDocumentsDto,
  SubmitShopDocumentsDto,
} from '@shops';
import { RateLimit } from '../../observability';
import { ShopsRpcService } from '../shop/shops-rpc.service';

@ApiTags('Media')
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
}
