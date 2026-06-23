import { PATH_METADATA } from '@nestjs/common/constants';
import { LiveController } from './live.controller';

describe('LiveController routes', () => {
  it('exposes live routes without the legacy products prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, LiveController)).toBe('/');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.listLiveSessions),
    ).toBe('live/sessions');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.getLiveReactionAggregate),
    ).toBe('live/sessions/:sessionId/reactions');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.listLiveComments),
    ).toBe('live/sessions/:sessionId/comments');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.createLiveComment),
    ).toBe('live/sessions/:sessionId/comments');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.updateLiveCommentVisibility),
    ).toBe('live/sessions/:sessionId/comments/:commentId/visibility');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.deleteLiveComment),
    ).toBe('live/sessions/:sessionId/comments/:commentId');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.createLiveSession),
    ).toBe('live/sessions');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.updateLiveSessionStatus),
    ).toBe('live/sessions/:sessionId/status');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.remindLiveSession),
    ).toBe('live/sessions/:sessionId/reminders');
  });
});
