import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import {
  CategoryCommandResponseDto,
  CategoryResponseDto,
  CreateCategoryDto,
} from '@catalog-metadata';
import { RateLimit } from '../../observability';
import { CatalogRpcService } from '../offer/catalog-rpc.service';

@ApiTags('Category')
@Controller()
export class CategoryController {
  constructor(private readonly catalogRpcService: CatalogRpcService) {}

  @ApiOperation({ summary: 'Lay danh sach category' })
  @ApiOkResponse({
    description: 'Danh sach category.',
    type: CategoryResponseDto,
    isArray: true,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('categories')
  findCategories() {
    return this.catalogRpcService.findCategories();
  }

  @ApiOperation({ summary: 'Admin tao category moi' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'image'],
      properties: {
        name: { type: 'string', example: 'My pham' },
        parentId: { type: 'string', nullable: true, example: 'parent-category-id' },
        riskTier: { type: 'string', example: 'medium' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Anh dai dien category, JPG/PNG/WEBP, toi da 5MB.',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Tao category thanh cong.',
    type: CategoryCommandResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Du lieu category khong hop le hoac parent category khong ton tai.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen tao category.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @Post('categories')
  async createCategory(
    @CurrentUserId() adminUserId: string,
    @Body() dto: CreateCategoryDto,
    @UploadedFile()
    image?: {
      buffer: Buffer;
      mimetype: string;
      originalname?: string;
      size: number;
    },
  ) {
    await this.catalogRpcService.createCategory({
      requesterUserId: adminUserId,
      name: dto.name,
      parentId: dto.parentId ?? null,
      image,
      riskTier: dto.riskTier,
    });

    return {
      success: true,
      message: 'Tạo danh mục thành công.',
    };
  }
}
