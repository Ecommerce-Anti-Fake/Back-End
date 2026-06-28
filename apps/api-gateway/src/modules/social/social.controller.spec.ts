import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { OptionalJwtAuthGuard } from '@security';
import { SocialController } from './social.controller';

describe('SocialController routes', () => {
  it('exposes social routes without the legacy products prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SocialController)).toBe('/');
    expect(
      Reflect.getMetadata(PATH_METADATA, SocialController.prototype.listSocialPosts),
    ).toBe('social/posts');
    expect(
      Reflect.getMetadata(PATH_METADATA, SocialController.prototype.getSocialPost),
    ).toBe('social/posts/:postId');
    expect(
      Reflect.getMetadata(PATH_METADATA, SocialController.prototype.listSocialComments),
    ).toBe('social/posts/:postId/comments');
    expect(
      Reflect.getMetadata(PATH_METADATA, SocialController.prototype.listSocialCommentReplies),
    ).toBe('social/comments/:commentId/replies');
    expect(
      Reflect.getMetadata(PATH_METADATA, SocialController.prototype.createSocialPost),
    ).toBe('social/posts');
    expect(
      Reflect.getMetadata(PATH_METADATA, SocialController.prototype.createSocialComment),
    ).toBe('social/posts/:postId/comments');
    expect(
      Reflect.getMetadata(PATH_METADATA, SocialController.prototype.createSocialCommentReply),
    ).toBe('social/comments/:commentId/replies');
    expect(
      Reflect.getMetadata(PATH_METADATA, SocialController.prototype.setSocialReaction),
    ).toBe('social/posts/:postId/reactions');
    expect(
      Reflect.getMetadata(PATH_METADATA, SocialController.prototype.removeSocialReaction),
    ).toBe('social/posts/:postId/reactions');
    expect(
      Reflect.getMetadata(PATH_METADATA, SocialController.prototype.shareSocialPost),
    ).toBe('social/posts/:postId/shares');
    expect(
      Reflect.getMetadata(PATH_METADATA, SocialController.prototype.updateSocialPostVisibility),
    ).toBe('social/posts/:postId/visibility');
  });

  it('optionally authenticates public post reads for viewer-specific state', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, SocialController.prototype.listSocialPosts)).toEqual([
      OptionalJwtAuthGuard,
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, SocialController.prototype.getSocialPost)).toEqual([
      OptionalJwtAuthGuard,
    ]);
  });

  it('returns only a success message after creating a social post', async () => {
    const catalogRpcService = {
      createSocialPost: jest.fn().mockResolvedValue({ id: 'post-id' }),
    };
    const controller = new SocialController(catalogRpcService as never);
    const media = [
      {
        buffer: Buffer.from('image-bytes'),
        mimetype: 'image/png',
        originalname: 'photo.png',
        size: 11,
      },
    ];

    await expect(
      controller.createSocialPost(
        'user-id',
        { postType: 'QUESTION', body: 'Kiem tra hang that the nao?' },
        media,
      ),
    ).resolves.toEqual({ message: 'Post created successfully.' });
    expect(catalogRpcService.createSocialPost).toHaveBeenCalledWith({
      requesterUserId: 'user-id',
      postType: 'QUESTION',
      body: 'Kiem tra hang that the nao?',
      media,
    });
  });

  it('propagates social post creation errors', async () => {
    const error = new Error('upload failed');
    const catalogRpcService = {
      createSocialPost: jest.fn().mockRejectedValue(error),
    };
    const controller = new SocialController(catalogRpcService as never);

    await expect(
      controller.createSocialPost('user-id', {
        postType: 'QUESTION',
        body: 'Kiem tra hang that the nao?',
      }),
    ).rejects.toBe(error);
  });

  it('returns only a success message after creating a comment reply', async () => {
    const catalogRpcService = {
      createSocialCommentReply: jest.fn().mockResolvedValue({
        id: 'reply-id',
        body: 'Cam on ban da chia se.',
      }),
    };
    const controller = new SocialController(catalogRpcService as never);

    await expect(
      controller.createSocialCommentReply('comment-id', 'user-id', {
        body: 'Cam on ban da chia se.',
      }),
    ).resolves.toEqual({ message: 'Reply created successfully.' });
    expect(catalogRpcService.createSocialCommentReply).toHaveBeenCalledWith({
      commentId: 'comment-id',
      requesterUserId: 'user-id',
      body: 'Cam on ban da chia se.',
    });
  });

  it('propagates comment reply creation errors', async () => {
    const error = new Error('comment not found');
    const catalogRpcService = {
      createSocialCommentReply: jest.fn().mockRejectedValue(error),
    };
    const controller = new SocialController(catalogRpcService as never);

    await expect(
      controller.createSocialCommentReply('comment-id', 'user-id', {
        body: 'Cam on ban da chia se.',
      }),
    ).rejects.toBe(error);
  });
});
