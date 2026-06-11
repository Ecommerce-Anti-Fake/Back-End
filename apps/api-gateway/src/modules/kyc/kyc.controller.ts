import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import {
  AdminUserKycDetailResponseDto,
  GetKycUploadSignaturesDto,
  KycUploadSignatureResponseDto,
  PaginatedAdminUserKycResponseDto,
  PendingKycQueryDto,
  ReviewUserKycDto,
  SubmitKycDto,
  UserKycResponseDto,
} from '@users';
import { RateLimit } from '../../observability';
import { DashboardSseBrokerService } from '../users/dashboard-sse-broker.service';
import { UsersRpcService } from '../users/users-rpc.service';

@ApiTags('KYC')
@Controller('user')
export class KycController {
  constructor(
    private readonly usersRpcService: UsersRpcService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
  ) {}

  @ApiOperation({ summary: 'Admin lay danh sach KYC dang cho duyet' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach ho so KYC dang cho duyet.',
    type: PaginatedAdminUserKycResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen truy cap.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/kyc/pending')
  findPendingKycs(@Query() query: PendingKycQueryDto) {
    return this.usersRpcService.findPendingKycs({
      verificationStatus: query.verificationStatus ?? 'pending',
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @ApiOperation({ summary: 'Admin lay chi tiet KYC va lich su nop lai cua user' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'ID user can xem chi tiet KYC.' })
  @ApiOkResponse({
    description: 'Chi tiet KYC hien tai va lich su nop lai.',
    type: AdminUserKycDetailResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen truy cap.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/:id/kyc-detail')
  getAdminKycDetail(@Param('id') userId: string) {
    return this.usersRpcService.getAdminKycDetail({ userId });
  }

  @ApiOperation({ summary: 'Lay trang thai KYC cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Thong tin KYC hien tai cua user.',
    type: UserKycResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('kyc')
  getMyKyc(@CurrentUserId() userId: string) {
    return this.usersRpcService.getMyKyc({ userId });
  }

  @ApiOperation({ summary: 'Lay chu ky upload 2 mat CCCD cho KYC' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach chu ky upload KYC documents.',
    type: KycUploadSignatureResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @RateLimit({ profile: 'uploadSignature' })
  @Post('kyc/document-upload-signatures')
  getKycUploadSignatures(@CurrentUserId() userId: string, @Body() dto: GetKycUploadSignaturesDto) {
    return this.usersRpcService.getKycUploadSignatures({
      userId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Gui ho so KYC voi CCCD 2 mat' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Gui KYC thanh cong, cho phe duyet.',
    type: UserKycResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Thong tin KYC hoac CCCD 2 mat khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('kyc')
  async submitKyc(@CurrentUserId() userId: string, @Body() dto: SubmitKycDto) {
    const result = await this.usersRpcService.submitKyc({
      userId,
      fullName: dto.fullName,
      dateOfBirth: dto.dateOfBirth,
      phone: dto.phone,
      idType: dto.idType,
      idNumber: dto.idNumber,
      documents: dto.documents,
    });
    this.dashboardSseBrokerService.notifyAccount(userId);
    this.dashboardSseBrokerService.notifyAdminQueue('moderation');

    return result;
  }

  @ApiOperation({ summary: 'Admin duyet hoac tu choi KYC cua user' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'ID user can duyet KYC.' })
  @ApiOkResponse({
    description: 'Cap nhat trang thai KYC thanh cong.',
    type: UserKycResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen duyet KYC.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post(':id/kyc/review')
  async reviewKyc(@Param('id') userId: string, @CurrentUserId() reviewerUserId: string, @Body() dto: ReviewUserKycDto) {
    const result = await this.usersRpcService.reviewKyc({
      reviewerUserId,
      userId,
      verificationStatus: dto.verificationStatus,
      reviewNote: dto.reviewNote ?? null,
    });
    this.dashboardSseBrokerService.notifyAccount(userId);
    this.dashboardSseBrokerService.notifyAdminQueue('moderation');

    return result;
  }
}
