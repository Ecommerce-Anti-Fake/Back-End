import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import { SubmitBrandAuthorizationDto } from '@shops';
import { RateLimit } from '../../observability';
import { ShopsRpcService } from '../shop/shops-rpc.service';

@ApiTags('Brand')
@Controller('shops')
export class BrandAuthorizationController {
  constructor(private readonly shopsRpcService: ShopsRpcService) {}

  @ApiOperation({ summary: 'Lay chu ky upload ho so uy quyen brand cua shop' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @RateLimit({ profile: 'uploadSignature' })
  @Post(':shopId/brands/:brandId/authorization/upload-signatures')
  getBrandAuthorizationUploadSignatures(
    @Param('shopId') shopId: string,
    @Param('brandId') brandId: string,
    @CurrentUserId() requesterUserId: string,
  ) {
    return this.shopsRpcService.getBrandAuthorizationUploadSignatures({
      shopId,
      brandId,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Nop ho so uy quyen brand cua shop' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':shopId/brands/:brandId/authorization')
  submitBrandAuthorization(
    @Param('shopId') shopId: string,
    @Param('brandId') brandId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: SubmitBrandAuthorizationDto,
  ) {
    return this.shopsRpcService.submitBrandAuthorization({
      shopId,
      brandId,
      requesterUserId,
      authorizationType: dto.authorizationType,
      mimeType: dto.mimeType,
      fileUrl: dto.fileUrl,
      publicId: dto.publicId,
    });
  }

  @ApiOperation({ summary: 'Admin lay danh sach ho so uy quyen brand' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/brand-authorizations')
  findAdminBrandAuthorizations(@Query('verificationStatus') verificationStatus?: 'pending' | 'approved' | 'rejected') {
    return this.shopsRpcService.findAdminBrandAuthorizations({
      verificationStatus,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach ho so uy quyen brand cua shop' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':shopId/brand-authorizations')
  findBrandAuthorizations(@Param('shopId') shopId: string, @CurrentUserId() requesterUserId: string) {
    return this.shopsRpcService.findBrandAuthorizations({
      shopId,
      requesterUserId,
    });
  }
}
