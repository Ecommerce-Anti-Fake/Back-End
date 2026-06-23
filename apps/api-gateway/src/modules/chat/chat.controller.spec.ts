import { PATH_METADATA } from '@nestjs/common/constants';
import { ChatController } from './chat.controller';

describe('ChatController routes', () => {
  it('exposes chat routes without the legacy products prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ChatController)).toBe('/');
    expect(
      Reflect.getMetadata(PATH_METADATA, ChatController.prototype.findChatThreads),
    ).toBe('chat/threads');
    expect(
      Reflect.getMetadata(PATH_METADATA, ChatController.prototype.getChatThread),
    ).toBe('chat/threads/:threadId');
    expect(
      Reflect.getMetadata(PATH_METADATA, ChatController.prototype.startChatThread),
    ).toBe('shops/:shopId/chat-thread');
    expect(
      Reflect.getMetadata(PATH_METADATA, ChatController.prototype.sendChatMessage),
    ).toBe('chat/threads/:threadId/messages');
  });
});
