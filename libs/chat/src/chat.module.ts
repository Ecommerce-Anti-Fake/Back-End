import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import {
  GetChatThreadUseCase,
  ListChatThreadsUseCase,
  SendChatMessageUseCase,
  StartChatThreadUseCase,
  StartShopChatThreadUseCase,
} from './application/use-cases';
import { ChatRepository } from './infrastructure/persistence/chat.repository';
import { ChatRpcController } from './presentation/rpc/chat.rpc-controller';

@Module({
  imports: [PrismaModule],
  controllers: [ChatRpcController],
  providers: [
    ChatRepository,
    ListChatThreadsUseCase,
    GetChatThreadUseCase,
    StartChatThreadUseCase,
    StartShopChatThreadUseCase,
    SendChatMessageUseCase,
  ],
  exports: [ChatRepository],
})
export class ChatModule {}
