import { PATH_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { MediaController } from './media.controller';
import { ShopDocumentController } from './shop-document.controller';

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

describe('ShopDocumentController routes', () => {
  it('groups shop document APIs under the Shop-Document Swagger tag', () => {
    expect(Reflect.getMetadata(DECORATORS.API_TAGS, ShopDocumentController)).toEqual(['Shop-Document']);
    expect(Reflect.getMetadata(PATH_METADATA, ShopDocumentController)).toBe('shops');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ShopDocumentController.prototype.findShopDocuments,
      ),
    ).toBe(':shopId/documents');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ShopDocumentController.prototype.getShopDocumentUploadSignatures,
      ),
    ).toBe(':shopId/documents/upload-signatures');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ShopDocumentController.prototype.submitShopDocuments,
      ),
    ).toBe(':shopId/documents');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        ShopDocumentController.prototype.findShopDocumentRequirements,
      ),
    ).toBe(':shopId/document-requirements');
  });
});
