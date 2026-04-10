import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { UsersIdentityService } from './users-identity.service';

describe('UsersIdentityService', () => {
  let service: UsersIdentityService;

  const usersRepositoryMock = {
    findById: jest.fn(),
    findByIdentifier: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersIdentityService,
        { provide: UsersRepository, useValue: usersRepositoryMock },
      ],
    }).compile();

    service = module.get<UsersIdentityService>(UsersIdentityService);
  });

  it('findById should delegate to UsersRepository', async () => {
    usersRepositoryMock.findById.mockResolvedValueOnce({ id: 'user-1' });

    await expect(service.findById('user-1')).resolves.toEqual({ id: 'user-1' });
    expect(usersRepositoryMock.findById).toHaveBeenCalledWith('user-1');
  });

  it('findByIdentifier should delegate to UsersRepository', async () => {
    const identifier = { email: 'user@example.com' };
    usersRepositoryMock.findByIdentifier.mockResolvedValueOnce({ id: 'user-1' });

    await expect(service.findByIdentifier(identifier)).resolves.toEqual({ id: 'user-1' });
    expect(usersRepositoryMock.findByIdentifier).toHaveBeenCalledWith(identifier);
  });

  it('create should delegate to UsersRepository', async () => {
    const payload = {
      email: 'user@example.com',
      phone: null,
      displayName: 'User',
      password: 'hashed-password',
    };
    usersRepositoryMock.create.mockResolvedValueOnce({ id: 'user-1' });

    await expect(service.create(payload)).resolves.toEqual({ id: 'user-1' });
    expect(usersRepositoryMock.create).toHaveBeenCalledWith(payload);
  });
});
