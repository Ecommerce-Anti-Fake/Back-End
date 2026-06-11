import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '@contracts';
import { ActiveUserGuard, CurrentUser, CurrentUserId, JwtAuthGuard } from '@security';
import {
  CreateSocialCommentDto,
  CreateSocialPostDto,
  ListSocialPostsQueryDto,
  SetSocialReactionDto,
  SocialPostResponseDto,
  UpdateSocialPostVisibilityDto,
} from '@products';
import { RateLimit } from '../../observability';
import { ProductsRpcService } from '../products/products-rpc.service';

@ApiTags('Social')
@Controller('products')
export class SocialController {
  constructor(private readonly productsRpcService: ProductsRpcService) {}

  @ApiOperation({ summary: 'Lay bang tin cong dong' })
  @ApiOkResponse({
    description: 'Danh sach bai viet cong dong.',
    type: SocialPostResponseDto,
    isArray: true,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('social/posts')
  listSocialPosts(@Query() query: ListSocialPostsQueryDto, @CurrentUser() requester?: AuthenticatedUser) {
    return this.productsRpcService.listSocialPosts({
      requesterUserId: requester?.id ?? null,
      includeHidden: query.includeHidden === 'true' && requester?.role === 'admin',
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @ApiOperation({ summary: 'Tao bai viet cong dong' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Bai viet da duoc tao.',
    type: SocialPostResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('social/posts')
  createSocialPost(@CurrentUserId() requesterUserId: string, @Body() dto: CreateSocialPostDto) {
    return this.productsRpcService.createSocialPost({
      requesterUserId,
      authorShopId: dto.authorShopId ?? null,
      postType: dto.postType,
      body: dto.body,
      offerId: dto.offerId ?? null,
    });
  }

  @ApiOperation({ summary: 'Binh luan bai viet cong dong' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Binh luan da duoc tao.',
    type: SocialPostResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('social/posts/:postId/comments')
  createSocialComment(
    @Param('postId') postId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
    @Body() dto: CreateSocialCommentDto,
  ) {
    return this.productsRpcService.createSocialComment({
      postId,
      requesterUserId,
      requesterRole: requester?.role,
      body: dto.body,
    });
  }

  @ApiOperation({ summary: 'Thich bai viet cong dong' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Trang thai bai viet sau khi thich.',
    type: SocialPostResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('social/posts/:postId/reactions')
  setSocialReaction(
    @Param('postId') postId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
    @Body() dto: SetSocialReactionDto,
  ) {
    return this.productsRpcService.setSocialReaction({
      postId,
      requesterUserId,
      requesterRole: requester?.role,
      reactionType: dto.reactionType ?? 'LIKE',
    });
  }

  @ApiOperation({ summary: 'Bo thich bai viet cong dong' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Trang thai bai viet sau khi bo thich.',
    type: SocialPostResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Delete('social/posts/:postId/reactions')
  removeSocialReaction(
    @Param('postId') postId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
    @Body() dto: SetSocialReactionDto,
  ) {
    return this.productsRpcService.removeSocialReaction({
      postId,
      requesterUserId,
      requesterRole: requester?.role,
      reactionType: dto.reactionType ?? 'LIKE',
    });
  }

  @ApiOperation({ summary: 'Chia se bai viet cong dong' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Trang thai bai viet sau khi chia se.',
    type: SocialPostResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('social/posts/:postId/shares')
  shareSocialPost(
    @Param('postId') postId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    return this.productsRpcService.shareSocialPost({
      postId,
      requesterUserId,
      requesterRole: requester?.role,
    });
  }

  @ApiOperation({ summary: 'An/hien bai viet cong dong' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Bai viet sau khi cap nhat hien thi.',
    type: SocialPostResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch('social/posts/:postId/visibility')
  updateSocialPostVisibility(
    @Param('postId') postId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
    @Body() dto: UpdateSocialPostVisibilityDto,
  ) {
    return this.productsRpcService.updateSocialPostVisibility({
      postId,
      requesterUserId,
      requesterRole: requester?.role,
      visibility: dto.visibility,
    });
  }
}
