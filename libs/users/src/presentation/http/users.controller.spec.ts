import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '@security';
import { PrismaService } from '@database/prisma/prisma.service';
import { GetCurrentUserProfileUseCase } from '../../application/use-cases/get-current-user-profile.use-case';
import { UsersService } from '../../application/services/users.service';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;

  const usersServiceMock = {
    findAll: jest.fn(),
  };

  const getCurrentUserProfileUseCaseMock = {
    execute: jest.fn(),
  };

  const jwtAuthGuardMock = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const jwtServiceMock = {
    verifyAsync: jest.fn(),
  };

  const prismaServiceMock = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersServiceMock },
        { provide: GetCurrentUserProfileUseCase, useValue: getCurrentUserProfileUseCaseMock },
        { provide: JwtAuthGuard, useValue: jwtAuthGuardMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll should delegate to UsersService', async () => {
    usersServiceMock.findAll.mockResolvedValueOnce([{ id: 'user-1' }]);

    await expect(controller.findAll()).resolves.toEqual([{ id: 'user-1' }]);
    expect(usersServiceMock.findAll).toHaveBeenCalled();
  });

  it('userProfile should delegate to GetCurrentUserProfileUseCase', async () => {
    getCurrentUserProfileUseCaseMock.execute.mockResolvedValueOnce({ id: 'user-1' });

    await expect(controller.userProfile({ user: { id: 'user-1' } })).resolves.toEqual({
      id: 'user-1',
    });
    expect(getCurrentUserProfileUseCaseMock.execute).toHaveBeenCalledWith('user-1');
  });
});
