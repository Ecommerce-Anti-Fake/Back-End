import { Test, TestingModule } from '@nestjs/testing';
import { OrdersRpcService } from '../orders/orders-rpc.service';
import { ShopsRpcService } from '../shops/shops-rpc.service';
import { UsersRpcService } from '../users/users-rpc.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;

  const usersRpcServiceMock = {
    findPendingKycs: jest.fn(),
  };

  const shopsRpcServiceMock = {
    findPendingVerification: jest.fn(),
  };

  const ordersRpcServiceMock = {
    getAdminOpenDisputeCount: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: UsersRpcService, useValue: usersRpcServiceMock },
        { provide: ShopsRpcService, useValue: shopsRpcServiceMock },
        { provide: OrdersRpcService, useValue: ordersRpcServiceMock },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should aggregate counts and previews for admin dashboard', async () => {
    usersRpcServiceMock.findPendingKycs.mockResolvedValueOnce(new Array(6).fill(null).map((_, index) => ({ id: `kyc-${index + 1}` })));
    shopsRpcServiceMock.findPendingVerification.mockResolvedValueOnce(
      new Array(3).fill(null).map((_, index) => ({ id: `shop-${index + 1}` })),
    );
    ordersRpcServiceMock.getAdminOpenDisputeCount.mockResolvedValueOnce({ openDisputes: 4 });

    const result = await service.getDashboard();

    expect(result).toEqual({
      counts: {
        pendingKycs: 6,
        pendingShopVerification: 3,
        openDisputes: 4,
      },
      previews: {
        pendingKycs: [{ id: 'kyc-1' }, { id: 'kyc-2' }, { id: 'kyc-3' }, { id: 'kyc-4' }, { id: 'kyc-5' }],
        pendingShopVerification: [{ id: 'shop-1' }, { id: 'shop-2' }, { id: 'shop-3' }],
      },
    });
  });
});
