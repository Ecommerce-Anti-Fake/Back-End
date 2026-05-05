import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { Post } from '@nestjs/common';
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
  CreateUserAddressDto,
  GetKycUploadSignaturesDto,
  PendingKycQueryDto,
  PaginatedAdminUserKycResponseDto,
  KycUploadSignatureResponseDto,
  AdminUserKycItemResponseDto,
  ListUsersQueryDto,
  ProfileCompletionResponseDto,
  ReviewUserKycDto,
  SubmitKycDto,
  UpdateUserAddressDto,
  UpdateUserDto,
  UserAddressResponseDto,
  UserKycResponseDto,
  UserResponseDto,
} from '@users';
import { UsersRpcService } from './users-rpc.service';

@ApiTags('Users')
@Controller('user')
export class UsersController {
  constructor(private readonly usersRpcService: UsersRpcService) {}

  @ApiOperation({ summary: 'Admin lay danh sach user' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach user.',
    type: UserResponseDto,
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
  @Get()
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersRpcService.findAll(query);
  }

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

  @ApiOperation({ summary: 'Lay thong tin user hien tai tu access token' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Thong tin user hien tai.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Tai khoan khong o trang thai active.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('userprofile')
  userProfile(@CurrentUserId() userId: string) {
    return this.usersRpcService.getCurrentProfile({ userId });
  }

  @ApiOperation({ summary: 'Lay tinh trang hoan thien profile cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Thong tin cac truong profile con thieu de frontend huong dan bo sung.',
    type: ProfileCompletionResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Tai khoan khong o trang thai active.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('profile-completion')
  getProfileCompletion(@CurrentUserId() userId: string) {
    return this.usersRpcService.getProfileCompletion({ userId });
  }

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
  createAddress(@CurrentUserId() userId: string, @Body() dto: CreateUserAddressDto) {
    return this.usersRpcService.createAddress({
      userId,
      recipientName: dto.recipientName,
      phone: dto.phone,
      addressLine: dto.addressLine,
      isDefault: dto.isDefault,
    });
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
  updateAddress(
    @CurrentUserId() userId: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateUserAddressDto,
  ) {
    return this.usersRpcService.updateAddress({
      userId,
      addressId,
      recipientName: dto.recipientName,
      phone: dto.phone,
      addressLine: dto.addressLine,
      isDefault: dto.isDefault,
    });
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
  setDefaultAddress(@CurrentUserId() userId: string, @Param('addressId') addressId: string) {
    return this.usersRpcService.setDefaultAddress({ userId, addressId });
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
  deleteAddress(@CurrentUserId() userId: string, @Param('addressId') addressId: string) {
    return this.usersRpcService.deleteAddress({ userId, addressId });
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
  submitKyc(@CurrentUserId() userId: string, @Body() dto: SubmitKycDto) {
    return this.usersRpcService.submitKyc({
      userId,
      fullName: dto.fullName,
      dateOfBirth: dto.dateOfBirth,
      phone: dto.phone,
      idType: dto.idType,
      idNumber: dto.idNumber,
      documents: dto.documents,
    });
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
  reviewKyc(@Param('id') userId: string, @CurrentUserId() reviewerUserId: string, @Body() dto: ReviewUserKycDto) {
    return this.usersRpcService.reviewKyc({
      reviewerUserId,
      userId,
      verificationStatus: dto.verificationStatus,
      reviewNote: dto.reviewNote ?? null,
    });
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
  @Get(':id')
  getById(@Param('id') id: string) {
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
  @Roles('admin', 'user')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersRpcService.updateUser({ id, ...dto });
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
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersRpcService.deleteUser({ id });
  }
}
