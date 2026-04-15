import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateShopDto, ShopResponseDto } from '@shops';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
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
}
