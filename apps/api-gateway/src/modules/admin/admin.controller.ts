import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActiveUserGuard, JwtAuthGuard, Roles, RolesGuard } from '@security';
import { AdminUserListItemResponseDto, ListUsersQueryDto, UpdateUserDto, UserResponseDto } from '@users';
import { DashboardSseBrokerService } from '../user/dashboard-sse-broker.service';
import { UsersRpcService } from '../user/users-rpc.service';
import { AdminService } from './admin.service';

class AdminDashboardCountDto {
  pendingKycs!: number;
  pendingShopVerification!: number;
  openDisputes!: number;
}

class AdminDashboardResponseDto {
  counts!: AdminDashboardCountDto;
  previews!: {
    pendingKycs: unknown[];
    pendingShopVerification: unknown[];
  };
}

class AdminKycSummaryDto {
  total!: number;
  byVerificationStatus!: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

class AdminShopVerificationSummaryDto {
  total!: number;
  byShopStatus!: {
    pending_kyc: number;
    pending_verification: number;
    active: number;
  };
  byRegistrationType!: {
    NORMAL: number;
    HANDMADE: number;
    MANUFACTURER: number;
    DISTRIBUTOR: number;
  };
}

class AdminDisputeSummaryDto {
  total!: number;
  byDisputeStatus!: {
    OPEN: number;
    RESOLVED: number;
    REFUNDED: number;
  };
  byCaseStatus!: {
    ASSIGNED: number;
    IN_REVIEW: number;
    ESCALATED: number;
    RESOLVED: number;
    CLOSED: number;
  };
}

class AdminModerationSummaryResponseDto {
  kyc!: AdminKycSummaryDto;
  shops!: AdminShopVerificationSummaryDto;
  disputes!: AdminDisputeSummaryDto;
}

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersRpcService: UsersRpcService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
  ) {}

  @ApiOperation({ summary: 'Admin lay dashboard tong quan can xu ly' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'So lieu tong quan va danh sach preview cho admin.',
    type: AdminDashboardResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen truy cap.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @ApiOperation({ summary: 'Admin lay summary counts cho moderation console' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Tong hop so luong theo status/type cho KYC, shop verification va dispute.',
    type: AdminModerationSummaryResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen truy cap.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('moderation-summary')
  getModerationSummary() {
    return this.adminService.getModerationSummary();
  }

  @ApiOperation({ summary: 'Admin lay danh sach user' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach user.',
    type: AdminUserListItemResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen truy cap.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('users')
  findUsers(@Query() query: ListUsersQueryDto) {
    return this.usersRpcService.findAll(query);
  }

  @ApiOperation({ summary: 'Admin lay chi tiet mot user' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'ID user can xem chi tiet.' })
  @ApiOkResponse({
    description: 'Thong tin chi tiet user.',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen truy cap.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('users/:id')
  getUserById(@Param('id') id: string) {
    return this.usersRpcService.getUserById({ id });
  }

  @ApiOperation({ summary: 'Admin cap nhat user' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'ID user can cap nhat.' })
  @ApiOkResponse({
    description: 'Cap nhat user thanh cong.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Du lieu khong hop le hoac email/phone da ton tai.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen truy cap.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Patch('users/:id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const result = await this.usersRpcService.updateUser({ id, ...dto });
    this.dashboardSseBrokerService.notifyAccount(id);

    return result;
  }

  @ApiOperation({ summary: 'Admin khoa mem user bang cach chuyen accountStatus sang inactive' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'ID user can vo hieu hoa.' })
  @ApiOkResponse({
    description: 'Vo hieu hoa user thanh cong.',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen truy cap.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Delete('users/:id')
  removeUser(@Param('id') id: string) {
    return this.usersRpcService.deleteUser({ id });
  }
}
