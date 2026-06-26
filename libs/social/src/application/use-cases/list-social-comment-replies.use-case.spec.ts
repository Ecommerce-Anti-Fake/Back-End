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
    repository.countSocialCommentReplies.mockResolvedValue(3);
    repository.listSocialCommentReplies.mockResolvedValue([
      socialReply({
        id: 'reply_001',
        authorUserId: 'u100',
        displayName: 'Admin AntiFake',
        avatar: 'https://cdn.example.com/u100.jpg',
        body: 'Cam on ban da phan hoi.',
        createdAt: new Date('2026-06-25T10:00:00.000Z'),
        likedByViewer: false,
        likeCount: 1,
        replyCount: 1,
        depth: 1,
        parentCommentId: 'comment-1',
        parentAuthorUserId: 'u001',
        parentDisplayName: 'Le Phuong Thao',
      }),
      socialReply({
        id: 'reply_002',
        authorUserId: 'u101',
        displayName: 'Shop Chinh Hang',
        avatar: 'https://cdn.example.com/u101.jpg',
        body: 'Neu can ho tro them hay lien he shop.',
        createdAt: new Date('2026-06-25T10:03:00.000Z'),
        likedByViewer: true,
        likeCount: 2,
        replyCount: 1,
        depth: 2,
        parentCommentId: 'reply_001',
        parentAuthorUserId: 'u100',
        parentDisplayName: 'Admin AntiFake',
      }),
      socialReply({
        id: 'reply_003',
        authorUserId: 'u102',
        displayName: 'Nguyen Van B',
        avatar: 'https://cdn.example.com/u102.jpg',
        body: 'Minh da hieu, cam on ban.',
        createdAt: new Date('2026-06-25T10:05:00.000Z'),
        likedByViewer: false,
        likeCount: 0,
        replyCount: 0,
        depth: 3,
        parentCommentId: 'reply_002',
        parentAuthorUserId: 'u101',
        parentDisplayName: 'Shop Chinh Hang',
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
      requesterUserId: 'viewer-1',
      page: 1,
      pageSize: 5,
    });
    expect(result).toEqual({
      page: 1,
      pageSize: 5,
      totalItems: 3,
      totalPages: 1,
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
          likeCount: 1,
          viewerLiked: false,
          replyCount: 1,
          parentCommentId: 'comment-1',
          depth: 1,
          replyToUser: {
            userId: 'u001',
            userName: 'Le Phuong Thao',
          },
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
          likeCount: 2,
          viewerLiked: true,
          replyCount: 1,
          parentCommentId: 'reply_001',
          depth: 2,
          replyToUser: {
            userId: 'u100',
            userName: 'Admin AntiFake',
          },
        },
        {
          id: 'reply_003',
          author: {
            id: 'u102',
            name: 'Nguyen Van B',
            avatar: 'https://cdn.example.com/u102.jpg',
          },
          body: 'Minh da hieu, cam on ban.',
          createdAt: new Date('2026-06-25T10:05:00.000Z'),
          likeCount: 0,
          viewerLiked: false,
          replyCount: 0,
          parentCommentId: 'reply_002',
          depth: 3,
          replyToUser: {
            userId: 'u101',
            userName: 'Shop Chinh Hang',
          },
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
  likedByViewer: boolean;
  likeCount: number;
  replyCount: number;
  depth: number;
  parentCommentId: string;
  parentAuthorUserId: string;
  parentDisplayName: string;
}) {
  return {
    id: input.id,
    postId: 'post-1',
    parentCommentId: input.parentCommentId,
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
    parentComment: {
      authorUserId: input.parentAuthorUserId,
      author: {
        id: input.parentAuthorUserId,
        displayName: input.parentDisplayName,
        email: 'thao@example.com',
        phone: null,
        avatarMedia: null,
      },
    },
    likes: input.likedByViewer ? [{ userId: 'viewer-1' }] : [],
    _count: { likes: input.likeCount, replies: input.replyCount },
    depth: input.depth,
  };
}
