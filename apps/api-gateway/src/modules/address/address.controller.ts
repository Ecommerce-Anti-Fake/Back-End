import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import { CreateUserAddressDto, UpdateUserAddressDto, UserAddressMutationResponseDto, UserAddressResponseDto } from '@users';
import { DashboardSseBrokerService } from '../user/dashboard-sse-broker.service';
import { UsersRpcService } from '../user/users-rpc.service';

@ApiTags('Address')
@ApiExtraModels(UserAddressResponseDto)
@Controller('user')
export class AddressController {
  constructor(
    private readonly usersRpcService: UsersRpcService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
  ) {}

  @ApiOperation({ summary: 'Lay danh sach dia chi giao hang cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach dia chi giao hang.',
    type: UserAddressResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('addresses')
  listAddresses(@CurrentUserId() userId: string) {
    return this.usersRpcService.listAddresses({ userId });
  }

  @ApiOperation({ summary: 'Lay dia chi giao hang mac dinh cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Dia chi giao hang mac dinh, hoac null neu user chua co dia chi mac dinh.',
    schema: {
      oneOf: [{ $ref: getSchemaPath(UserAddressResponseDto) }, { type: 'null' }],
    },
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('addresses/default')
  getDefaultAddress(@CurrentUserId() userId: string) {
    return this.usersRpcService.getDefaultAddress({ userId });
  }

  @ApiOperation({ summary: 'Them dia chi giao hang cho user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Tao dia chi thanh cong.',
    type: UserAddressMutationResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('addresses')
  async createAddress(@CurrentUserId() userId: string, @Body() dto: CreateUserAddressDto) {
    await this.usersRpcService.createAddress({
      userId,
      recipientName: dto.recipientName,
      phone: dto.phone,
      addressLine: dto.addressLine,
      provinceCode: dto.provinceCode ?? null,
      provinceName: dto.provinceName ?? null,
      wardCode: dto.wardCode ?? null,
      wardName: dto.wardName ?? null,
      isDefault: dto.isDefault,
    });
    this.dashboardSseBrokerService.notifyAccount(userId);

    return { success: true };
  }

  @ApiOperation({ summary: 'Cap nhat dia chi giao hang cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'addressId', description: 'ID dia chi can cap nhat.' })
  @ApiOkResponse({
    description: 'Cap nhat dia chi thanh cong.',
    type: UserAddressMutationResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch('addresses/:addressId')
  async updateAddress(
    @CurrentUserId() userId: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateUserAddressDto,
  ) {
    await this.usersRpcService.updateAddress({
      userId,
      addressId,
      recipientName: dto.recipientName,
      phone: dto.phone,
      addressLine: dto.addressLine,
      provinceCode: dto.provinceCode,
      provinceName: dto.provinceName,
      wardCode: dto.wardCode,
      wardName: dto.wardName,
      isDefault: dto.isDefault,
    });
    this.dashboardSseBrokerService.notifyAccount(userId);

    return { success: true };
  }

  @ApiOperation({ summary: 'Dat mot dia chi lam mac dinh' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'addressId', description: 'ID dia chi can dat mac dinh.' })
  @ApiOkResponse({
    description: 'Dia chi mac dinh moi.',
    type: UserAddressResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('addresses/:addressId/default')
  async setDefaultAddress(@CurrentUserId() userId: string, @Param('addressId') addressId: string) {
    const result = await this.usersRpcService.setDefaultAddress({ userId, addressId });
    this.dashboardSseBrokerService.notifyAccount(userId);

    return result;
  }

  @ApiOperation({ summary: 'Xoa dia chi giao hang cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'addressId', description: 'ID dia chi can xoa.' })
  @ApiOkResponse({
    description: 'Dia chi da xoa.',
    type: UserAddressResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Delete('addresses/:addressId')
  async deleteAddress(@CurrentUserId() userId: string, @Param('addressId') addressId: string) {
    const result = await this.usersRpcService.deleteAddress({ userId, addressId });
    this.dashboardSseBrokerService.notifyAccount(userId);

    return result;
  }
}
