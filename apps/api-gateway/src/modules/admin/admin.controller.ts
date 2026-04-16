import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ActiveUserGuard, JwtAuthGuard, Roles, RolesGuard } from '@security';
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

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
