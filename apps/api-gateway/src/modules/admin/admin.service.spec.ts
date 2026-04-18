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
    usersRpcServiceMock.findPendingKycs.mockResolvedValueOnce({
      total: 6,
      items: new Array(6).fill(null).map((_, index) => ({ id: `kyc-${index + 1}` })),
    });
    shopsRpcServiceMock.findPendingVerification.mockResolvedValueOnce({
      total: 3,
      items: new Array(3).fill(null).map((_, index) => ({ id: `shop-${index + 1}` })),
    });
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

  it('should aggregate moderation summary counts for admin badges', async () => {
    usersRpcServiceMock.getAdminKycSummary = jest.fn().mockResolvedValueOnce({
      total: 10,
      byVerificationStatus: {
        pending: 4,
        approved: 5,
        rejected: 1,
      },
    });
    shopsRpcServiceMock.getAdminVerificationSummary = jest.fn().mockResolvedValueOnce({
      total: 8,
      byShopStatus: {
        pending_kyc: 2,
        pending_verification: 3,
        active: 3,
      },
      byRegistrationType: {
        NORMAL: 2,
        HANDMADE: 1,
        MANUFACTURER: 3,
        DISTRIBUTOR: 2,
      },
    });
    ordersRpcServiceMock.getAdminDisputeSummary = jest.fn().mockResolvedValueOnce({
      total: 6,
      byDisputeStatus: {
        OPEN: 3,
        RESOLVED: 2,
        REFUNDED: 1,
      },
      byCaseStatus: {
        ASSIGNED: 1,
        IN_REVIEW: 2,
        ESCALATED: 1,
        RESOLVED: 1,
        CLOSED: 1,
      },
    });

    const result = await service.getModerationSummary();

    expect(result).toEqual({
      kyc: {
        total: 10,
        byVerificationStatus: {
          pending: 4,
          approved: 5,
          rejected: 1,
        },
      },
      shops: {
        total: 8,
        byShopStatus: {
          pending_kyc: 2,
          pending_verification: 3,
          active: 3,
        },
        byRegistrationType: {
          NORMAL: 2,
          HANDMADE: 1,
          MANUFACTURER: 3,
          DISTRIBUTOR: 2,
        },
      },
      disputes: {
        total: 6,
        byDisputeStatus: {
          OPEN: 3,
          RESOLVED: 2,
          REFUNDED: 1,
        },
        byCaseStatus: {
          ASSIGNED: 1,
          IN_REVIEW: 2,
          ESCALATED: 1,
          RESOLVED: 1,
          CLOSED: 1,
        },
      },
    });
  });
});
