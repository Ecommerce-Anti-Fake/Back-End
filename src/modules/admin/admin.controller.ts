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
}
