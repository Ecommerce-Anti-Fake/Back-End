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
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import { ListUsersQueryDto, UpdateUserDto, UserResponseDto } from '@users';
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
  @Roles('admin, user')
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
