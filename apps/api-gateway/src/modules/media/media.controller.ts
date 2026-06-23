import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import {
  AddOfferDocumentsBatchDto,
  AddOfferMediaBatchDto,
  GetOfferDocumentUploadSignaturesDto,
  GetOfferMediaUploadSignaturesDto,
  OfferDocumentResponseDto,
  OfferMediaResponseDto,
  OfferMediaUploadSignatureResponseDto,
} from '@offer-assets';
import { RateLimit } from '../../observability';
import { CatalogRpcService } from '../offer/catalog-rpc.service';

@ApiTags('Media')
@Controller()
export class MediaController {
  constructor(private readonly catalogRpcService: CatalogRpcService) {}

  @ApiOperation({ summary: 'Lay chu ky upload media cho offer' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Danh sach chu ky upload offer media.',
    type: OfferMediaUploadSignatureResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @RateLimit({ profile: 'uploadSignature' })
  @Post('offers/:offerId/media/upload-signatures')
  getOfferMediaUploadSignatures(
    @Param('offerId') offerId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: GetOfferMediaUploadSignaturesDto,
  ) {
    return this.catalogRpcService.getOfferMediaUploadSignatures({
      offerId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Luu metadata media da upload cho offer' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Danh sach offer media da luu.',
    type: OfferMediaResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('offers/:offerId/media')
  addOfferMediaBatch(
    @Param('offerId') offerId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: AddOfferMediaBatchDto,
  ) {
    return this.catalogRpcService.addOfferMediaBatch({
      offerId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Dat media offer lam anh dai dien' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Media offer da duoc dat lam anh dai dien.',
    type: OfferMediaResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch('offers/:offerId/media/:mediaId/primary')
  setOfferPrimaryMedia(
    @Param('offerId') offerId: string,
    @Param('mediaId') mediaId: string,
    @CurrentUserId() requesterUserId: string,
  ) {
    return this.catalogRpcService.setOfferPrimaryMedia({
      offerId,
      mediaId,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach media cua offer' })
  @ApiOkResponse({
    description: 'Danh sach media cua offer.',
    type: OfferMediaResponseDto,
    isArray: true,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('offers/:offerId/media')
  findOfferMedia(@Param('offerId') offerId: string) {
    return this.catalogRpcService.findOfferMedia({ offerId });
  }

  @ApiOperation({ summary: 'Xoa media cua offer' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Xoa media offer thanh cong.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Delete('offers/:offerId/media/:mediaId')
  deleteOfferMedia(
    @Param('offerId') offerId: string,
    @Param('mediaId') mediaId: string,
    @CurrentUserId() requesterUserId: string,
  ) {
    return this.catalogRpcService.deleteOfferMedia({
      offerId,
      mediaId,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Lay chu ky upload tai lieu cho offer' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Danh sach chu ky upload offer documents.',
    type: OfferMediaUploadSignatureResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @RateLimit({ profile: 'uploadSignature' })
  @Post('offers/:offerId/documents/upload-signatures')
  getOfferDocumentUploadSignatures(
    @Param('offerId') offerId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: GetOfferDocumentUploadSignaturesDto,
  ) {
    return this.catalogRpcService.getOfferDocumentUploadSignatures({
      offerId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Luu metadata tai lieu da upload cho offer' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Danh sach tai lieu offer da luu.',
    type: OfferDocumentResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('offers/:offerId/documents')
  addOfferDocumentsBatch(
    @Param('offerId') offerId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: AddOfferDocumentsBatchDto,
  ) {
    return this.catalogRpcService.addOfferDocumentsBatch({
      offerId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach tai lieu cua offer' })
  @ApiOkResponse({
    description: 'Danh sach tai lieu cua offer.',
    type: OfferDocumentResponseDto,
    isArray: true,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('offers/:offerId/documents')
  findOfferDocuments(@Param('offerId') offerId: string) {
    return this.catalogRpcService.findOfferDocuments({ offerId });
  }

  @ApiOperation({ summary: 'Xoa tai lieu cua offer' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Xoa tai lieu offer thanh cong.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Delete('offers/:offerId/documents/:documentId')
  deleteOfferDocument(
    @Param('offerId') offerId: string,
    @Param('documentId') documentId: string,
    @CurrentUserId() requesterUserId: string,
  ) {
    return this.catalogRpcService.deleteOfferDocument({
      offerId,
      documentId,
      requesterUserId,
    });
  }
}
