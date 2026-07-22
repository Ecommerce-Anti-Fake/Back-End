import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import { OrdersRpcService } from '../order/orders-rpc.service';

class CreateVoucherDto {
  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']) discountType!: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @Type(() => Number) @IsNumber() percentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() fixedAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxDiscountAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() minOrderAmount?: number;
  @IsOptional() @IsString() scopeType?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) scopeIds?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) totalUsageLimit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) userUsageLimit?: number;
  @IsString() startsAt!: string;
  @IsString() endsAt!: string;
}

class VoucherListQueryDto {
  @IsOptional() @IsIn(['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED']) status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}

class VoucherStatusDto {
  @IsIn(['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED']) status!: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED';
}

@ApiTags('Voucher')
@Controller()
export class VoucherController {
  constructor(private readonly ordersRpcService: OrdersRpcService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('shops/:shopId/vouchers')
  createShopVoucher(@CurrentUserId() requesterUserId: string, @Param('shopId') shopId: string, @Body() dto: CreateVoucherDto) {
    return this.ordersRpcService.createVoucher({ requesterUserId, ownerType: 'SHOP', shopId, ...dto });
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('shops/:shopId/vouchers')
  listShopVouchers(@CurrentUserId() requesterUserId: string, @Param('shopId') shopId: string, @Query() query: VoucherListQueryDto) {
    return this.ordersRpcService.listVouchers({ requesterUserId, ownerType: 'SHOP', shopId, ...query });
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('shops/:shopId/vouchers/:voucherId')
  getShopVoucher(@CurrentUserId() requesterUserId: string, @Param('voucherId') voucherId: string) {
    return this.ordersRpcService.getVoucher({ requesterUserId, voucherId });
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch('shops/:shopId/vouchers/:voucherId')
  updateShopVoucher(@CurrentUserId() requesterUserId: string, @Param('voucherId') voucherId: string, @Body() dto: Partial<CreateVoucherDto>) {
    return this.ordersRpcService.updateVoucher({ requesterUserId, voucherId, ...dto });
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch('shops/:shopId/vouchers/:voucherId/status')
  updateShopVoucherStatus(@CurrentUserId() requesterUserId: string, @Param('voucherId') voucherId: string, @Body() dto: VoucherStatusDto) {
    return this.ordersRpcService.updateVoucherStatus({ requesterUserId, voucherId, status: dto.status });
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('shops/:shopId/vouchers/:voucherId/activate')
  activateShopVoucher(@CurrentUserId() requesterUserId: string, @Param('voucherId') voucherId: string) {
    return this.ordersRpcService.updateVoucherStatus({ requesterUserId, voucherId, status: 'ACTIVE' });
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('shops/:shopId/vouchers/:voucherId/deactivate')
  deactivateShopVoucher(@CurrentUserId() requesterUserId: string, @Param('voucherId') voucherId: string) {
    return this.ordersRpcService.updateVoucherStatus({ requesterUserId, voucherId, status: 'PAUSED' });
  }

  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/vouchers')
  createSystemVoucher(@CurrentUserId() requesterUserId: string, @Body() dto: CreateVoucherDto) {
    return this.ordersRpcService.createVoucher({ requesterUserId, ownerType: 'SYSTEM', shopId: null, ...dto });
  }

  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/vouchers')
  listAdminVouchers(@CurrentUserId() requesterUserId: string, @Query() query: VoucherListQueryDto) {
    return this.ordersRpcService.listVouchers({ requesterUserId, ownerType: 'SYSTEM', ...query });
  }

  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/vouchers/:voucherId')
  getAdminVoucher(@CurrentUserId() requesterUserId: string, @Param('voucherId') voucherId: string) {
    return this.ordersRpcService.getVoucher({ requesterUserId, voucherId });
  }

  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Patch('admin/vouchers/:voucherId')
  updateAdminVoucher(@CurrentUserId() requesterUserId: string, @Param('voucherId') voucherId: string, @Body() dto: Partial<CreateVoucherDto>) {
    return this.ordersRpcService.updateVoucher({ requesterUserId, voucherId, ...dto });
  }

  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/vouchers/:voucherId/redemptions')
  listAdminVoucherRedemptions(@CurrentUserId() requesterUserId: string, @Param('voucherId') voucherId: string, @Query() query: VoucherListQueryDto) {
    return this.ordersRpcService.listVoucherRedemptions({ requesterUserId, voucherId, page: query.page, pageSize: query.pageSize });
  }

  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Patch('admin/vouchers/:voucherId/status')
  updateSystemVoucherStatus(@CurrentUserId() requesterUserId: string, @Param('voucherId') voucherId: string, @Body() dto: VoucherStatusDto) {
    return this.ordersRpcService.updateVoucherStatus({ requesterUserId, voucherId, status: dto.status });
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('vouchers/available')
  listAvailableVouchers(@CurrentUserId() requesterUserId: string) {
    return this.ordersRpcService.listVouchers({ requesterUserId, status: 'ACTIVE', page: 1, pageSize: 100 });
  }
}
