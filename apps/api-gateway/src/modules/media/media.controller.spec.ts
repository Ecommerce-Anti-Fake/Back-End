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
      (ShopDocumentController.prototype as Record<string, unknown>).getShopDocumentUploadSignatures,
    ).toBeUndefined();
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

  it('submits multipart shop documents by matching docTypes to files', async () => {
    const shopsRpcService = {
      submitShopDocuments: jest.fn().mockResolvedValue({ success: true }),
    };
    const controller = new ShopDocumentController(shopsRpcService as never);
    const files = [
      {
        buffer: Buffer.from('license'),
        mimetype: 'image/jpeg',
        originalname: 'license.jpg',
        size: 7,
      },
    ];

    await expect(
      controller.submitShopDocuments(
        'shop-1',
        'user-1',
        { docTypes: ['BUSINESS_LICENSE'] },
        files,
      ),
    ).resolves.toEqual({ success: true });

    expect(shopsRpcService.submitShopDocuments).toHaveBeenCalledWith({
      shopId: 'shop-1',
      requesterUserId: 'user-1',
      items: [
        {
          docType: 'BUSINESS_LICENSE',
          file: files[0],
        },
      ],
    });
  });
});
