import { NotFoundException } from '@nestjs/common';
import { ListSocialCommentsUseCase } from './list-social-comments.use-case';

describe('ListSocialCommentsUseCase', () => {
  const repository = {
    findSocialPostById: jest.fn(),
    countSocialComments: jest.fn(),
    listSocialComments: jest.fn(),
  };
  const useCase = new ListSocialCommentsUseCase(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findSocialPostById.mockResolvedValue({
      id: 'post-1',
      authorUserId: 'author-1',
      visibility: 'PUBLIC',
    });
    repository.countSocialComments.mockResolvedValue(26);
    repository.listSocialComments.mockResolvedValue([
      socialComment({
        id: 'cmt_001',
        authorUserId: 'u001',
        displayName: 'Le Phuong Thao',
        avatar: 'https://cdn.example.com/u001.jpg',
        body: 'Da quet QR va xac thuc thanh cong.',
        createdAt: new Date('2026-06-25T09:30:00.000Z'),
        likedByViewer: true,
        likeCount: 12,
        replyCount: 3,
      }),
      socialComment({
        id: 'cmt_002',
        authorUserId: 'u002',
        displayName: 'Nguyen Van A',
        avatar: 'https://cdn.example.com/u002.jpg',
        body: 'Shop giao hang rat nhanh.',
        createdAt: new Date('2026-06-25T09:40:00.000Z'),
        likedByViewer: false,
        likeCount: 2,
        replyCount: 0,
      }),
    ]);
  });

  it('returns paginated comments for a public post', async () => {
    const result = await useCase.execute({
      postId: 'post-1',
      requesterUserId: 'viewer-1',
      page: 1,
      pageSize: 10,
    });

    expect(repository.listSocialComments).toHaveBeenCalledWith({
      postId: 'post-1',
      requesterUserId: 'viewer-1',
      page: 1,
      pageSize: 10,
    });
    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 26,
      totalPages: 3,
      items: [
        {
          id: 'cmt_001',
          author: {
            id: 'u001',
            name: 'Le Phuong Thao',
            avatar: 'https://cdn.example.com/u001.jpg',
          },
          body: 'Da quet QR va xac thuc thanh cong.',
          createdAt: new Date('2026-06-25T09:30:00.000Z'),
          likeCount: 12,
          viewerLiked: true,
          replyCount: 3,
        },
        {
          id: 'cmt_002',
          author: {
            id: 'u002',
            name: 'Nguyen Van A',
            avatar: 'https://cdn.example.com/u002.jpg',
          },
          body: 'Shop giao hang rat nhanh.',
          createdAt: new Date('2026-06-25T09:40:00.000Z'),
          likeCount: 2,
          viewerLiked: false,
          replyCount: 0,
        },
      ],
    });
  });

  it('hides comments when the post is hidden from the viewer', async () => {
    repository.findSocialPostById.mockResolvedValue({
      id: 'post-1',
      authorUserId: 'author-1',
      visibility: 'HIDDEN',
    });

    await expect(
      useCase.execute({ postId: 'post-1', requesterUserId: 'viewer-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function socialComment(input: {
  id: string;
  authorUserId: string;
  displayName: string;
  avatar: string;
  body: string;
  createdAt: Date;
  likedByViewer: boolean;
  likeCount: number;
  replyCount: number;
}) {
  return {
    id: input.id,
    postId: 'post-1',
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
    likes: input.likedByViewer ? [{ userId: 'viewer-1' }] : [],
    _count: { likes: input.likeCount, replies: input.replyCount },
  };
}
