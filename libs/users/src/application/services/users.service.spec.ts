import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const usersRepositoryMock = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: usersRepositoryMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll should delegate to UsersRepository', async () => {
    usersRepositoryMock.findAll.mockResolvedValueOnce([{ id: 'user-1' }]);

    await expect(service.findAll()).resolves.toEqual([{ id: 'user-1' }]);
    expect(usersRepositoryMock.findAll).toHaveBeenCalled();
  });
});
