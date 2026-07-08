import { ChatRepository } from './chat.repository';

describe('ChatRepository.findChatThreadsForUser', () => {
  it('always scopes the list to the requester, including admins', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repository = new ChatRepository({ chatThread: { findMany } } as never);

    await repository.findChatThreadsForUser({ requesterUserId: 'admin-1', requesterRole: 'admin' });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ buyerUserId: 'admin-1' }, { sellerUserId: 'admin-1' }] },
    }));
  });
});
