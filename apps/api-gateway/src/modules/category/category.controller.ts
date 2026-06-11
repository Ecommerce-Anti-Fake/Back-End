import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActiveUserGuard, JwtAuthGuard, Roles, RolesGuard } from '@security';
import { CategoryResponseDto, CreateCategoryDto } from '@products';
import { RateLimit } from '../../observability';
import { CatalogRpcService } from '../offer/catalog-rpc.service';

@ApiTags('Category')
@Controller('products')
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
  @ApiCreatedResponse({
    description: 'Tao category thanh cong.',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Du lieu category khong hop le hoac parent category khong ton tai.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen tao category.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogRpcService.createCategory({
      name: dto.name,
      parentId: dto.parentId ?? null,
      riskTier: dto.riskTier,
    });
  }
}
