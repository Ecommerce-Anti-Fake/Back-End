import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import {
  CreateShopDto,
  PaginatedPublicShopSummaryResponseDto,
  PublicShopCategoryResponseDto,
  PublicShopDetailResponseDto,
  PublicShopSummaryResponseDto,
  PublicShopsQueryDto,
  ShopMutationResponseDto,
  UpdateShopProfileDto,
} from '@shops';
import { ShopsRpcService } from './shops-rpc.service';

@ApiTags('Shop')
@Controller('shops')
export class ShopController {
  constructor(private readonly shopsRpcService: ShopsRpcService) {}

  @ApiOperation({ summary: 'Tao shop moi cho user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: ShopMutationResponseDto })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post()
  async create(@CurrentUserId() ownerUserId: string, @Body() dto: CreateShopDto) {
    await this.shopsRpcService.create({
      ownerUserId,
      shopName: dto.shopName,
      registrationType: dto.registrationType,
      businessType: dto.businessType,
      taxCode: dto.taxCode ?? null,
      warehouseAddress: dto.warehouseAddress ?? null,
      warehouseProvinceCode: dto.warehouseProvinceCode ?? null,
      warehouseProvinceName: dto.warehouseProvinceName ?? null,
      warehouseWardCode: dto.warehouseWardCode ?? null,
      warehouseWardName: dto.warehouseWardName ?? null,
      categoryIds: dto.categoryIds,
    });

    return { success: true };
  }

  @ApiOperation({ summary: 'Cap nhat ho so co ban cua shop hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: ShopMutationResponseDto })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch(':shopId/profile')
  async updateProfile(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: UpdateShopProfileDto,
  ) {
    await this.shopsRpcService.updateProfile({
      shopId,
      requesterUserId,
      shopName: dto.shopName,
      businessType: dto.businessType,
      taxCode: dto.taxCode ?? null,
      warehouseAddress: dto.warehouseAddress,
      warehouseProvinceCode: dto.warehouseProvinceCode,
      warehouseProvinceName: dto.warehouseProvinceName,
      warehouseWardCode: dto.warehouseWardCode,
      warehouseWardName: dto.warehouseWardName,
    });

    return { success: true };
  }

  @ApiOperation({ summary: 'Lay danh sach shop cua user hien tai' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('mine')
  findMine(@CurrentUserId() ownerUserId: string) {
    return this.shopsRpcService.findMine({ ownerUserId });
  }

  @ApiOperation({ summary: 'Lay danh sach shop public co phan trang' })
  @ApiOkResponse({ type: PaginatedPublicShopSummaryResponseDto })
  @Get()
  findPublic(@Query() query: PublicShopsQueryDto) {
    return this.shopsRpcService.findPublic({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  @ApiOperation({ summary: 'Lay thong tin shop public theo offer ID' })
  @ApiOkResponse({ type: PublicShopSummaryResponseDto })
  @Get('by-offer/:offerId')
  findByOfferId(@Param('offerId') offerId: string) {
    return this.shopsRpcService.findByOffer({ offerId });
  }

  @ApiOperation({ summary: 'Lay danh sach category public cua shop' })
  @ApiOkResponse({ type: PublicShopCategoryResponseDto, isArray: true })
  @Get(':shopId/categories')
  findCategoriesByShopId(@Param('shopId') shopId: string) {
    return this.shopsRpcService.findCategoriesByShopId({ shopId });
  }

  @ApiOperation({ summary: 'Lay thong tin chi tiet mot shop' })
  @ApiOkResponse({ type: PublicShopDetailResponseDto })
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.shopsRpcService.findById({ id });
  }
}
