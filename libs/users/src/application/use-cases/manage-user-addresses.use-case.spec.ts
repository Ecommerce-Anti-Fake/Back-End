import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { GetDefaultUserAddressUseCase } from './manage-user-addresses.use-case';

describe('GetDefaultUserAddressUseCase', () => {
  let useCase: GetDefaultUserAddressUseCase;

  const usersRepositoryMock = {
    findDefaultAddressByUserId: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetDefaultUserAddressUseCase,
        { provide: UsersRepository, useValue: usersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<GetDefaultUserAddressUseCase>(GetDefaultUserAddressUseCase);
  });

  it('returns the current user default address', async () => {
    usersRepositoryMock.findDefaultAddressByUserId.mockResolvedValueOnce({
      id: 'address-1',
      userId: 'user-1',
      recipientName: 'Nguyen Van A',
      phone: '0987654321',
      addressLine: '12 Nguyen Trai, Quan 1, TP.HCM',
      isDefault: true,
      createdAt: new Date('2026-05-04T09:00:00.000Z'),
      updatedAt: new Date('2026-05-04T09:00:00.000Z'),
    });

    await expect(useCase.execute('user-1')).resolves.toMatchObject({
      id: 'address-1',
      userId: 'user-1',
      isDefault: true,
    });
    expect(usersRepositoryMock.findDefaultAddressByUserId).toHaveBeenCalledWith('user-1');
  });

  it('returns null when the current user has no default address', async () => {
    usersRepositoryMock.findDefaultAddressByUserId.mockResolvedValueOnce(null);

    await expect(useCase.execute('user-1')).resolves.toBeNull();
  });
});
