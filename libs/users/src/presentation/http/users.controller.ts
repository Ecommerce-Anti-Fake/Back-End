import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import { GetCurrentUserProfileUseCase } from '../../application/use-cases/get-current-user-profile.use-case';
import { UsersService } from '../../application/services/users.service';

@ApiTags('Users')
@Controller('user')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly getCurrentUserProfileUseCase: GetCurrentUserProfileUseCase,
  ) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
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
  async userProfile(@CurrentUserId() userId: string) {
    return this.getCurrentUserProfileUseCase.execute(userId);
  }
}
