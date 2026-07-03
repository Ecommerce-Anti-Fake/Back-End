import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import {
  CategoryDocumentUploadSignaturesDto,
  SubmitCategoryDocumentsDto,
  SubmitShopDocumentsMultipartDto,
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

  @ApiOperation({ summary: 'Nop ho so phap ly cua shop' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['docTypes', 'files'],
      properties: {
        docTypes: {
          type: 'array',
          items: { type: 'string', example: 'BUSINESS_LICENSE' },
          description: 'Danh sach loai ho so, theo dung thu tu voi files.',
        },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Danh sach anh ho so phap ly, toi da 10 file.',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Thieu file, thieu docTypes, so luong khong khop, file khong phai anh hoac qua lon.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 5 * 1024 * 1024 } }))
  @Post(':shopId/documents')
  submitShopDocuments(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: SubmitShopDocumentsMultipartDto = { docTypes: [] },
    @UploadedFiles()
    files: Array<{
      buffer: Buffer;
      mimetype: string;
      originalname?: string;
      size: number;
    }> = [],
  ) {
    const docTypes = normalizeDocTypes(dto.docTypes);
    if (files.length === 0) {
      throw new BadRequestException('At least one shop document file is required');
    }

    if (docTypes.length !== files.length) {
      throw new BadRequestException('docTypes count must match files count');
    }

    return this.shopsRpcService.submitShopDocuments({
      shopId,
      requesterUserId,
      items: files.map((file, index) => ({
        docType: docTypes[index],
        file,
      })),
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

function normalizeDocTypes(docTypes?: string | string[]) {
  if (Array.isArray(docTypes)) {
    return docTypes.map((docType) => docType.trim()).filter(Boolean);
  }

  const value = docTypes?.trim();
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((docType) => String(docType).trim()).filter(Boolean);
    }
  } catch {
    // Fall back to comma-separated form.
  }

  return value.split(',').map((docType) => docType.trim()).filter(Boolean);
}
