import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import {
  GetChatThreadUseCase,
  ListChatThreadsUseCase,
  SendChatMessageUseCase,
  StartChatThreadUseCase,
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
    SendChatMessageUseCase,
  ],
  exports: [ChatRepository],
})
export class ChatModule {}

