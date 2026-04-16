import { Test, TestingModule } from '@nestjs/testing';
import { GetCurrentUserProfileCompletionUseCase } from './get-current-user-profile-completion.use-case';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';

describe('GetCurrentUserProfileCompletionUseCase', () => {
  let useCase: GetCurrentUserProfileCompletionUseCase;

  const usersRepositoryMock = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCurrentUserProfileCompletionUseCase,
        { provide: UsersRepository, useValue: usersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<GetCurrentUserProfileCompletionUseCase>(GetCurrentUserProfileCompletionUseCase);
  });

  it('should report missing phone when profile is not order-ready', async () => {
    usersRepositoryMock.findById.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@example.com',
      phone: null,
      displayName: 'Nguyen Van A',
      role: 'user',
      accountStatus: 'active',
      createdAt: new Date('2026-04-16T09:00:00.000Z'),
      updatedAt: new Date('2026-04-16T09:00:00.000Z'),
    });

    const result = await useCase.execute('user-1');

    expect(result).toMatchObject({
      userId: 'user-1',
      missingProfileFields: ['phone'],
      isOrderReady: false,
    });
  });
});
