import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '@contracts';
import { ActiveUserGuard, CurrentUser, CurrentUserId, JwtAuthGuard } from '@security';
import {
  ChatThreadDetailResponseDto,
  ChatThreadListItemResponseDto,
  ChatThreadResponseDto,
  SendChatMessageDto,
  StartChatThreadDto,
} from '@chat';
import { CatalogRpcService } from '../offer/catalog-rpc.service';

@ApiTags('Chat')
@Controller('products')
export class ChatController {
  constructor(private readonly catalogRpcService: CatalogRpcService) {}

  @ApiOperation({ summary: 'Lay danh sach chat thread cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach chat thread.',
    type: ChatThreadListItemResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('chat/threads')
  findChatThreads(@CurrentUserId() requesterUserId: string, @CurrentUser() requester?: AuthenticatedUser) {
    return this.catalogRpcService.findChatThreads({
      requesterUserId,
      requesterRole: requester?.role,
    });
  }

  @ApiOperation({ summary: 'Lay chi tiet chat thread' })
  @ApiBearerAuth('access-token')
  @ApiQuery({
    name: 'before',
    required: false,
    description: 'Cursor để lấy message cũ hơn. Lần đầu mở thread thì bỏ trống.',
    example: '2026-06-04T09:51:05.445Z|message-id',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số message mỗi lần lấy. Mặc định 50, tối đa 50.',
    example: 50,
  })
  @ApiOkResponse({
    description: 'Chi tiet chat thread.',
    type: ChatThreadDetailResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('chat/threads/:threadId')
  getChatThread(
    @Param('threadId') threadId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester?: AuthenticatedUser,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogRpcService.getChatThread({
      threadId,
      requesterUserId,
      requesterRole: requester?.role,
      before: before ?? null,
      limit: limit ? Number(limit) : 50,
    });
  }

  @ApiOperation({ summary: 'Bat dau chat theo offer' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Chat thread da san sang.',
    type: ChatThreadResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('shops/:shopId/chat-thread')
  startChatThread(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: StartChatThreadDto,
  ) {
    return this.catalogRpcService.startChatThread({
      shopId,
      requesterUserId,
      initialMessage: dto.initialMessage ?? null,
    });
  }

  @ApiOperation({ summary: 'Gui tin nhan vao chat thread' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tin nhan da luu.',
    type: ChatThreadResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('chat/threads/:threadId/messages')
  sendChatMessage(
    @Param('threadId') threadId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.catalogRpcService.sendChatMessage({
      threadId,
      requesterUserId,
      requesterRole: requester?.role,
      body: dto.body,
      clientMessageId: dto.clientMessageId ?? null,
      messageType: 'TEXT',
    });
  }
}