import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '@contracts';
import { ActiveUserGuard, CurrentUser, CurrentUserId, JwtAuthGuard } from '@security';
import { ChatThreadResponseDto, SendChatMessageDto, StartChatThreadDto } from '@products';
import { ProductsRpcService } from '../products/products-rpc.service';

@ApiTags('Chat')
@Controller('products')
export class ChatController {
  constructor(private readonly productsRpcService: ProductsRpcService) {}

  @ApiOperation({ summary: 'Lay danh sach chat thread cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach chat thread.',
    type: ChatThreadResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('chat/threads')
  findChatThreads(@CurrentUserId() requesterUserId: string, @CurrentUser() requester?: AuthenticatedUser) {
    return this.productsRpcService.findChatThreads({
      requesterUserId,
      requesterRole: requester?.role,
    });
  }

  @ApiOperation({ summary: 'Lay chi tiet chat thread' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Chi tiet chat thread.',
    type: ChatThreadResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('chat/threads/:threadId')
  getChatThread(
    @Param('threadId') threadId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.productsRpcService.getChatThread({
      threadId,
      requesterUserId,
      requesterRole: requester?.role,
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
    return this.productsRpcService.startChatThread({
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
    return this.productsRpcService.sendChatMessage({
      threadId,
      requesterUserId,
      requesterRole: requester?.role,
      body: dto.body,
      clientMessageId: dto.clientMessageId ?? null,
      messageType: 'TEXT',
    });
  }
}
