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
});
