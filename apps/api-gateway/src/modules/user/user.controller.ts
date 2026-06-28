import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import {
  AvatarUploadResponseDto,
  ProfileCompletionResponseDto,
  ProfileMutationSuccessResponseDto,
  UpdateCurrentUserProfileDto,
  UpdateUserDto,
  UserResponseDto,
} from '@users';
import { DashboardSseBrokerService } from './dashboard-sse-broker.service';
import { UsersRpcService } from './users-rpc.service';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(
    private readonly usersRpcService: UsersRpcService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
  ) {}

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

  @ApiOperation({ summary: 'Cap nhat ho so cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Cap nhat ho so thanh cong.',
    type: ProfileMutationSuccessResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Du lieu khong hop le hoac phone da ton tai.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Tai khoan khong o trang thai active.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch('profile')
  async updateCurrentProfile(@CurrentUserId() userId: string, @Body() dto: UpdateCurrentUserProfileDto) {
    const result = await this.usersRpcService.updateCurrentProfile({ userId, ...dto });
    this.dashboardSseBrokerService.notifyAccount(userId);

    return result;
  }

  @ApiOperation({ summary: 'Upload avatar cho user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['avatar'],
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Mot file anh avatar duy nhat.',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Upload avatar thanh cong.',
    type: AvatarUploadResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'File avatar bi thieu, khong phai anh, rong hoac qua lon.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Tai khoan khong o trang thai active.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @Post('avatar')
  async uploadAvatar(
    @CurrentUserId() userId: string,
    @UploadedFile() avatar?: {
      buffer: Buffer;
      mimetype: string;
      originalname?: string;
      size: number;
    },
  ) {
    if (!avatar) {
      throw new BadRequestException('Avatar image is required');
    }

    const result = await this.usersRpcService.uploadCurrentAvatar({ userId, avatar });
    this.dashboardSseBrokerService.notifyAccount(userId);

    return result;
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
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const result = await this.usersRpcService.updateUser({ id, ...dto });
    this.dashboardSseBrokerService.notifyAccount(id);

    return result;
  }

}
