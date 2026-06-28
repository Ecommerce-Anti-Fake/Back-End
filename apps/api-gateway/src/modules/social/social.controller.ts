import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '@contracts';
import { ActiveUserGuard, CurrentUser, CurrentUserId, JwtAuthGuard, OptionalJwtAuthGuard } from '@security';
import {
  CreateSocialCommentDto,
  CreateSocialCommentReplyDto,
  CreateSocialPostDto,
  ListSocialCommentRepliesQueryDto,
  ListSocialCommentsQueryDto,
  ListSocialPostsQueryDto,
  SocialCommentMutationResponseDto,
  SocialCommentReplyMutationResponseDto,
  SocialCommentRepliesPageResponseDto,
  SocialCommentsPageResponseDto,
  SocialPostMutationResponseDto,
  SetSocialReactionDto,
  SocialPostResponseDto,
  UpdateSocialPostVisibilityDto,
} from '@social';
import { RateLimit } from '../../observability';
import { CatalogRpcService } from '../offer/catalog-rpc.service';

@ApiTags('Social')
@Controller()
export class SocialController {
  constructor(private readonly catalogRpcService: CatalogRpcService) {}

  @ApiOperation({ summary: 'Lay bang tin cong dong' })
  @ApiOkResponse({
    description: 'Danh sach bai viet cong dong.',
    type: SocialPostResponseDto,
    isArray: true,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @UseGuards(OptionalJwtAuthGuard)
  @Get('social/posts')
  listSocialPosts(@Query() query: ListSocialPostsQueryDto, @CurrentUser() requester?: AuthenticatedUser) {
    return this.catalogRpcService.listSocialPosts({
      requesterUserId: requester?.id ?? null,
      includeHidden: query.includeHidden === 'true' && requester?.role === 'admin',
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @ApiOperation({ summary: 'Lay chi tiet bai viet cong dong' })
  @ApiOkResponse({
    description: 'Chi tiet bai viet cong dong.',
    type: SocialPostResponseDto,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @UseGuards(OptionalJwtAuthGuard)
  @Get('social/posts/:postId')
  getSocialPost(
    @Param('postId') postId: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.catalogRpcService.getSocialPost({
      postId,
      requesterUserId: requester?.id ?? '',
      requesterRole: requester?.role,
    });
  }

  @ApiOperation({ summary: 'Lay binh luan cua bai viet cong dong' })
  @ApiOkResponse({
    description: 'Danh sach binh luan cua bai viet.',
    type: SocialCommentsPageResponseDto,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('social/posts/:postId/comments')
  listSocialComments(
    @Param('postId') postId: string,
    @Query() query: ListSocialCommentsQueryDto,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.catalogRpcService.listSocialComments({
      postId,
      requesterUserId: requester?.id ?? null,
      requesterRole: requester?.role,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @ApiOperation({ summary: 'Lay phan hoi cua binh luan cong dong' })
  @ApiOkResponse({
    description: 'Danh sach phan hoi cua binh luan.',
    type: SocialCommentRepliesPageResponseDto,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('social/comments/:commentId/replies')
  listSocialCommentReplies(
    @Param('commentId') commentId: string,
    @Query() query: ListSocialCommentRepliesQueryDto,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.catalogRpcService.listSocialCommentReplies({
      commentId,
      requesterUserId: requester?.id ?? null,
      requesterRole: requester?.role,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @ApiOperation({ summary: 'Tao bai viet cong dong' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['postType', 'body'],
      properties: {
        postType: { type: 'string', enum: ['SHARE', 'QUESTION', 'PRODUCT_SHARE'], example: 'QUESTION' },
        body: { type: 'string', example: 'Lam sao de kiem tra san pham nay chinh hang?' },
        media: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Toi da 5 anh hoac video ngan.',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Bai viet da duoc tao.',
    type: SocialPostMutationResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @UseInterceptors(
    FilesInterceptor('media', 5, {
      limits: { fileSize: 30 * 1024 * 1024 },
    }),
  )
  @Post('social/posts')
  async createSocialPost(
    @CurrentUserId() requesterUserId: string,
    @Body() dto: CreateSocialPostDto,
    @UploadedFiles() media: Array<{
      buffer: Buffer;
      mimetype: string;
      originalname?: string;
      size: number;
    }> = [],
  ) {
    await this.catalogRpcService.createSocialPost({
      requesterUserId,
      postType: dto.postType,
      body: dto.body,
      media,
    });

    return {
      message: 'Post created successfully.',
    };
  }

  @ApiOperation({ summary: 'Binh luan bai viet cong dong' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Binh luan da duoc tao.',
    type: SocialCommentMutationResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('social/posts/:postId/comments')
  async createSocialComment(
    @Param('postId') postId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
    @Body() dto: CreateSocialCommentDto,
  ) {
    await this.catalogRpcService.createSocialComment({
      postId,
      requesterUserId,
      requesterRole: requester?.role,
      body: dto.body,
    });

    return {
      message: 'Comment created successfully.',
    };
  }

  @ApiOperation({ summary: 'Tra loi binh luan cong dong' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Phan hoi binh luan da duoc tao.',
    type: SocialCommentReplyMutationResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('social/comments/:commentId/replies')
  async createSocialCommentReply(
    @Param('commentId') commentId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: CreateSocialCommentReplyDto,
  ) {
    await this.catalogRpcService.createSocialCommentReply({
      commentId,
      requesterUserId,
      body: dto.body,
    });

    return {
      message: 'Reply created successfully.',
    };
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
    return this.catalogRpcService.setSocialReaction({
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
    return this.catalogRpcService.removeSocialReaction({
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
    return this.catalogRpcService.shareSocialPost({
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
    return this.catalogRpcService.updateSocialPostVisibility({
      postId,
      requesterUserId,
      requesterRole: requester?.role,
      visibility: dto.visibility,
    });
  }
}
