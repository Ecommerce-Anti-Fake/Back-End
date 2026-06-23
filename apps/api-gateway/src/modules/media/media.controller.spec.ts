import { PATH_METADATA } from '@nestjs/common/constants';
import { MediaController } from './media.controller';

describe('MediaController routes', () => {
  it('exposes offer media and documents without the legacy products prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, MediaController)).toBe('/');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        MediaController.prototype.getOfferMediaUploadSignatures,
      ),
    ).toBe('offers/:offerId/media/upload-signatures');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        MediaController.prototype.addOfferMediaBatch,
      ),
    ).toBe('offers/:offerId/media');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        MediaController.prototype.findOfferMedia,
      ),
    ).toBe('offers/:offerId/media');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        MediaController.prototype.getOfferDocumentUploadSignatures,
      ),
    ).toBe('offers/:offerId/documents/upload-signatures');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        MediaController.prototype.addOfferDocumentsBatch,
      ),
    ).toBe('offers/:offerId/documents');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        MediaController.prototype.findOfferDocuments,
      ),
    ).toBe('offers/:offerId/documents');
  });
});
