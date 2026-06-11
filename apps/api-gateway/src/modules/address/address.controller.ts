import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import { CreateUserAddressDto, UpdateUserAddressDto, UserAddressResponseDto } from '@users';
import { DashboardSseBrokerService } from '../users/dashboard-sse-broker.service';
import { UsersRpcService } from '../users/users-rpc.service';

@ApiTags('Address')
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

  @ApiOperation({ summary: 'Them dia chi giao hang cho user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Dia chi vua tao.',
    type: UserAddressResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('addresses')
  async createAddress(@CurrentUserId() userId: string, @Body() dto: CreateUserAddressDto) {
    const result = await this.usersRpcService.createAddress({
      userId,
      recipientName: dto.recipientName,
      phone: dto.phone,
      addressLine: dto.addressLine,
      isDefault: dto.isDefault,
    });
    this.dashboardSseBrokerService.notifyAccount(userId);

    return result;
  }

  @ApiOperation({ summary: 'Cap nhat dia chi giao hang cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'addressId', description: 'ID dia chi can cap nhat.' })
  @ApiOkResponse({
    description: 'Dia chi sau cap nhat.',
    type: UserAddressResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch('addresses/:addressId')
  async updateAddress(
    @CurrentUserId() userId: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateUserAddressDto,
  ) {
    const result = await this.usersRpcService.updateAddress({
      userId,
      addressId,
      recipientName: dto.recipientName,
      phone: dto.phone,
      addressLine: dto.addressLine,
      isDefault: dto.isDefault,
    });
    this.dashboardSseBrokerService.notifyAccount(userId);

    return result;
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
