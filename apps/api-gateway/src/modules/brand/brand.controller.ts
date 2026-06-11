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
import { BrandResponseDto, CreateBrandDto } from '@products';
import { RateLimit } from '../../observability';
import { CatalogRpcService } from '../offer/catalog-rpc.service';

@ApiTags('Brand')
@Controller('products')
export class BrandController {
  constructor(private readonly catalogRpcService: CatalogRpcService) {}

  @ApiOperation({ summary: 'Lay danh sach brand' })
  @ApiOkResponse({
    description: 'Danh sach brand.',
    type: BrandResponseDto,
    isArray: true,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('brands')
  findBrands() {
    return this.catalogRpcService.findBrands();
  }

  @ApiOperation({ summary: 'Admin tao brand moi' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao brand thanh cong.',
    type: BrandResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Du lieu brand khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen tao brand.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('brands')
  createBrand(@Body() dto: CreateBrandDto) {
    return this.catalogRpcService.createBrand({
      name: dto.name,
      registryStatus: dto.registryStatus,
    });
  }
}
