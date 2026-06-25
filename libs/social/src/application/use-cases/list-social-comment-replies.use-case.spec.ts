import { NotFoundException } from '@nestjs/common';
import { ListSocialCommentRepliesUseCase } from './list-social-comment-replies.use-case';

describe('ListSocialCommentRepliesUseCase', () => {
  const repository = {
    findSocialCommentById: jest.fn(),
    countSocialCommentReplies: jest.fn(),
    listSocialCommentReplies: jest.fn(),
  };
  const useCase = new ListSocialCommentRepliesUseCase(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findSocialCommentById.mockResolvedValue({
      id: 'comment-1',
      visibility: 'PUBLIC',
      post: { visibility: 'PUBLIC', authorUserId: 'post-author' },
    });
    repository.countSocialCommentReplies.mockResolvedValue(12);
    repository.listSocialCommentReplies.mockResolvedValue([
      socialReply({
        id: 'reply_001',
        authorUserId: 'u100',
        displayName: 'Admin AntiFake',
        avatar: 'https://cdn.example.com/u100.jpg',
        body: 'Cam on ban da phan hoi.',
        createdAt: new Date('2026-06-25T10:00:00.000Z'),
      }),
      socialReply({
        id: 'reply_002',
        authorUserId: 'u101',
        displayName: 'Shop Chinh Hang',
        avatar: 'https://cdn.example.com/u101.jpg',
        body: 'Neu can ho tro them hay lien he shop.',
        createdAt: new Date('2026-06-25T10:03:00.000Z'),
      }),
    ]);
  });

  it('returns paginated replies for a public comment', async () => {
    const result = await useCase.execute({
      commentId: 'comment-1',
      requesterUserId: 'viewer-1',
      page: 1,
      pageSize: 5,
    });

    expect(repository.listSocialCommentReplies).toHaveBeenCalledWith({
      commentId: 'comment-1',
      page: 1,
      pageSize: 5,
    });
    expect(result).toEqual({
      page: 1,
      pageSize: 5,
      totalItems: 12,
      totalPages: 3,
      items: [
        {
          id: 'reply_001',
          author: {
            id: 'u100',
            name: 'Admin AntiFake',
            avatar: 'https://cdn.example.com/u100.jpg',
          },
          body: 'Cam on ban da phan hoi.',
          createdAt: new Date('2026-06-25T10:00:00.000Z'),
          likeCount: 0,
          viewerLiked: false,
        },
        {
          id: 'reply_002',
          author: {
            id: 'u101',
            name: 'Shop Chinh Hang',
            avatar: 'https://cdn.example.com/u101.jpg',
          },
          body: 'Neu can ho tro them hay lien he shop.',
          createdAt: new Date('2026-06-25T10:03:00.000Z'),
          likeCount: 0,
          viewerLiked: false,
        },
      ],
    });
  });

  it('hides replies when the parent comment is hidden', async () => {
    repository.findSocialCommentById.mockResolvedValue({
      id: 'comment-1',
      visibility: 'HIDDEN',
      post: { visibility: 'PUBLIC', authorUserId: 'post-author' },
    });

    await expect(
      useCase.execute({ commentId: 'comment-1', requesterUserId: 'viewer-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function socialReply(input: {
  id: string;
  authorUserId: string;
  displayName: string;
  avatar: string;
  body: string;
  createdAt: Date;
}) {
  return {
    id: input.id,
    commentId: 'comment-1',
    authorUserId: input.authorUserId,
    body: input.body,
    visibility: 'PUBLIC',
    createdAt: input.createdAt,
    author: {
      id: input.authorUserId,
      displayName: input.displayName,
      email: null,
      phone: null,
      avatarMedia: { secureUrl: input.avatar },
    },
  };
}
