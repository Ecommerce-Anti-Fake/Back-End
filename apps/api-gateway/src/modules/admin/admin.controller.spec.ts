import { PATH_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger';
import { ReviewShopDocumentDto } from '@shops';
import { AdminShopVerificationController } from './admin-shop-verification.controller';
import { AdminController } from './admin.controller';

describe('AdminController routes', () => {
  it('owns admin user management routes under the admin prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AdminController)).toBe('admin');
    expect(Reflect.getMetadata(PATH_METADATA, AdminController.prototype.findUsers)).toBe('users');
    expect(Reflect.getMetadata(PATH_METADATA, AdminController.prototype.getUserById)).toBe('users/:id');
    expect(Reflect.getMetadata(PATH_METADATA, AdminController.prototype.updateUser)).toBe('users/:id');
    expect(Reflect.getMetadata(PATH_METADATA, AdminController.prototype.removeUser)).toBe('users/:id');
  });

  it('documents shop registration review status as a Swagger enum', () => {
    const reviewStatusMetadata = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES,
      ReviewShopDocumentDto.prototype,
      'reviewStatus',
    );

    expect(reviewStatusMetadata.enum).toEqual(['approved', 'rejected']);
  });
});

describe('AdminShopVerificationController routes', () => {
  it('owns admin shop verification routes under the shops admin prefix', () => {
    expect(Reflect.getMetadata(DECORATORS.API_TAGS, AdminShopVerificationController)).toEqual(['Admin']);
    expect(Reflect.getMetadata(PATH_METADATA, AdminShopVerificationController)).toBe('shops/admin');
    expect(Reflect.getMetadata(PATH_METADATA, AdminShopVerificationController.prototype.findPendingVerification)).toBe(
      'list-shop',
    );
    expect(Reflect.getMetadata(PATH_METADATA, AdminShopVerificationController.prototype.getAdminVerificationDetail)).toBe(
      ':shopId/verification-detail',
    );
    expect(Reflect.getMetadata(PATH_METADATA, AdminShopVerificationController.prototype.getAdminRegistrationDetail)).toBe(
      ':shopId/registration-detail',
    );
    expect(Reflect.getMetadata(PATH_METADATA, AdminShopVerificationController.prototype.reviewShopDocument)).toBe(
      ':shopId/documents/review',
    );
  });
});
