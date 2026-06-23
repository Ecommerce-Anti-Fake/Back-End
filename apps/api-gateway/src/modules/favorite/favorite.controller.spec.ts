import { PATH_METADATA } from '@nestjs/common/constants';
import { FavoriteController } from './favorite.controller';

describe('FavoriteController routes', () => {
  it('exposes favorites without the legacy products prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, FavoriteController)).toBe('/');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        FavoriteController.prototype.findFavoriteOffers,
      ),
    ).toBe('favorites');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        FavoriteController.prototype.addFavoriteOffer,
      ),
    ).toBe('offers/:offerId/favorite');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        FavoriteController.prototype.removeFavoriteOffer,
      ),
    ).toBe('offers/:offerId/favorite');
  });
});
