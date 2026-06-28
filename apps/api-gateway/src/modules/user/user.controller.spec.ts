import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { UserController } from './user.controller';

describe('UserController routes', () => {
  it('does not expose a generic GET /user/:id route that can shadow account subresources', () => {
    const genericGetUserRoute = Object.getOwnPropertyNames(UserController.prototype).some((methodName) => {
      const handler = UserController.prototype[methodName as keyof UserController];

      return (
        typeof handler === 'function' &&
        Reflect.getMetadata(PATH_METADATA, handler) === ':id' &&
        Reflect.getMetadata(METHOD_METADATA, handler) === RequestMethod.GET
      );
    });

    expect(genericGetUserRoute).toBe(false);
  });

  it('exposes PATCH /user/profile before the generic PATCH /user/:id route', () => {
    const routeNames = Object.getOwnPropertyNames(UserController.prototype).filter((methodName) => {
      const handler = UserController.prototype[methodName as keyof UserController];

      return typeof handler === 'function' && Reflect.getMetadata(METHOD_METADATA, handler) === RequestMethod.PATCH;
    });

    const paths = routeNames.map((methodName) =>
      Reflect.getMetadata(PATH_METADATA, UserController.prototype[methodName as keyof UserController]),
    );

    expect(paths).toContain('profile');
    expect(paths.indexOf('profile')).toBeLessThan(paths.indexOf(':id'));
  });

  it('exposes POST /user/avatar for single avatar upload', () => {
    const avatarRoute = Object.getOwnPropertyNames(UserController.prototype).some((methodName) => {
      const handler = UserController.prototype[methodName as keyof UserController];

      return (
        typeof handler === 'function' &&
        Reflect.getMetadata(PATH_METADATA, handler) === 'avatar' &&
        Reflect.getMetadata(METHOD_METADATA, handler) === RequestMethod.POST
      );
    });

    expect(avatarRoute).toBe(true);
  });
});
