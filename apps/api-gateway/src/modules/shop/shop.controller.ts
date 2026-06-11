import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import { CreateShopDto, UpdateShopProfileDto } from '@shops';
import { ShopsRpcService } from './shops-rpc.service';

@ApiTags('Shop')
@Controller('shops')
export class ShopController {
  constructor(private readonly shopsRpcService: ShopsRpcService) {}

  @ApiOperation({ summary: 'Tao shop moi cho user hien tai' })
  @ApiBearerAuth('access-token')
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
      taxCode: dto.taxCode ?? null,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach shop cua user hien tai' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('mine')
  findMine(@CurrentUserId() ownerUserId: string) {
    return this.shopsRpcService.findMine({ ownerUserId });
  }

  @ApiOperation({ summary: 'Lay thong tin chi tiet mot shop' })
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.shopsRpcService.findById({ id });
  }
}
