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
      Reflect.getMetadata(PATH_METADATA, ChatController.prototype.startChatThreadWithUser),
    ).toBe('users/:userId/chat-thread');
    expect(
      Reflect.getMetadata(PATH_METADATA, ChatController.prototype.sendChatMessage),
    ).toBe('chat/threads/:threadId/messages');
  });

  it('forwards the requester role when an admin starts chat', async () => {
    const rpc = {
      startChatThread: jest.fn(),
      startShopChatThread: jest.fn(),
    };
    const controller = new ChatController(rpc as never);

    await controller.startChatThread('shop-1', 'admin-1', { role: 'admin' } as never);
    await controller.startChatThreadWithUser('user-1', 'admin-1', { role: 'admin' } as never);

    expect(rpc.startChatThread).toHaveBeenCalledWith({
      shopId: 'shop-1', requesterUserId: 'admin-1', requesterRole: 'admin',
    });
    expect(rpc.startShopChatThread).toHaveBeenCalledWith({
      userId: 'user-1', requesterUserId: 'admin-1', requesterRole: 'admin',
    });
  });
});
