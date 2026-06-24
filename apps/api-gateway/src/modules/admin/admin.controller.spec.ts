import { PATH_METADATA } from '@nestjs/common/constants';
import { AdminController } from './admin.controller';

describe('AdminController routes', () => {
  it('owns admin user management routes under the admin prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AdminController)).toBe('admin');
    expect(Reflect.getMetadata(PATH_METADATA, AdminController.prototype.findUsers)).toBe('users');
    expect(Reflect.getMetadata(PATH_METADATA, AdminController.prototype.getUserById)).toBe('users/:id');
    expect(Reflect.getMetadata(PATH_METADATA, AdminController.prototype.updateUser)).toBe('users/:id');
    expect(Reflect.getMetadata(PATH_METADATA, AdminController.prototype.removeUser)).toBe('users/:id');
  });
});
