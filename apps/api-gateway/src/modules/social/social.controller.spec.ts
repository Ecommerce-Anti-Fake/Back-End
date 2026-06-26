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
});
