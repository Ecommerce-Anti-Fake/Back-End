import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from '../libs/security/src/guards/roles.guard';
import { ROLES_KEY } from '../libs/security/src/decorators/roles.decorator';

describe('RolesGuard Regression Tests', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeAll(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  describe('No roles required - should always allow access', () => {
    it('should return true when no @Roles() decorator is applied', () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-123', role: 'normal-user' },
          }),
        }),
        getType: () => 'http',
      } as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should return true when @Roles() is applied with empty array', () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-123', role: 'normal-user' },
          }),
        }),
        getType: () => 'http',
      } as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
    });
  });

  describe('Admin-only routes - should reject non-admin users', () => {
    it('should throw ForbiddenException when non-admin user tries to access admin route', () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-123', role: 'buyer' },
          }),
        }),
        getType: () => 'http',
      } as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should allow admin user to access admin route', () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'admin-123', role: 'admin' },
          }),
        }),
        getType: () => 'http',
      } as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
    });
  });

  describe('Case-insensitive role comparison', () => {
    it('should allow access when roles match case-insensitively (uppercase)', () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'admin-123', role: 'ADMIN' },
          }),
        }),
        getType: () => 'http',
      } as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should allow access when roles match case-insensitively (mixed case)', () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'admin-123', role: 'AdMiN' },
          }),
        }),
        getType: () => 'http',
      } as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
    });
  });

  describe('Multi-role support', () => {
    it('should allow access to any of the required roles', () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'seller-123', role: 'seller' },
          }),
        }),
        getType: () => 'http',
      } as ExecutionContext;

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['admin', 'seller']);

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should reject user with role not in required roles list', () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'buyer-123', role: 'buyer' },
          }),
        }),
        getType: () => 'http',
      } as ExecutionContext;

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['admin', 'seller']);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });

  describe('Missing or invalid user data', () => {
    it('should throw ForbiddenException when user role is missing but roles are required', () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-123' }, // no role
          }),
        }),
        getType: () => 'http',
      } as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user is undefined but roles are required', () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({}), // no user
        }),
        getType: () => 'http',
      } as ExecutionContext;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });
  });
});
