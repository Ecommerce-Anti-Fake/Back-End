import { Injectable } from '@nestjs/common';
import { OrdersRpcService } from '../orders/orders-rpc.service';
import { ShopsRpcService } from '../shops/shops-rpc.service';
import { UsersRpcService } from '../users/users-rpc.service';

type PendingKycPreviewItem = { id: string };
type PendingShopVerificationPreviewItem = { id: string };
type AdminOpenDisputeCountResponse = { openDisputes: number };
type PaginatedPendingKycsResponse = { total: number; items: PendingKycPreviewItem[] };
type PaginatedPendingVerificationShopsResponse = { total: number; items: PendingShopVerificationPreviewItem[] };
type AdminKycSummaryResponse = {
  total: number;
  byVerificationStatus: Record<string, number>;
};
type AdminShopVerificationSummaryResponse = {
  total: number;
  byShopStatus: Record<string, number>;
  byRegistrationType: Record<string, number>;
};
type AdminDisputeSummaryResponse = {
  total: number;
  byDisputeStatus: Record<string, number>;
  byCaseStatus: Record<string, number>;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly usersRpcService: UsersRpcService,
    private readonly shopsRpcService: ShopsRpcService,
    private readonly ordersRpcService: OrdersRpcService,
  ) {}

  async getDashboard() {
    const [pendingKycs, pendingVerificationShops, disputeOverview] = (await Promise.all([
      this.usersRpcService.findPendingKycs({ verificationStatus: 'pending' }),
      this.shopsRpcService.findPendingVerification({ shopStatus: 'pending_verification' }),
      this.ordersRpcService.getAdminOpenDisputeCount(),
    ])) as [
      PaginatedPendingKycsResponse,
      PaginatedPendingVerificationShopsResponse,
      AdminOpenDisputeCountResponse,
    ];

    return {
      counts: {
        pendingKycs: pendingKycs.total,
        pendingShopVerification: pendingVerificationShops.total,
        openDisputes: disputeOverview.openDisputes,
      },
      previews: {
        pendingKycs: pendingKycs.items.slice(0, 5),
        pendingShopVerification: pendingVerificationShops.items.slice(0, 5),
      },
    };
  }

  async getModerationSummary() {
    const [kyc, shops, disputes] = (await Promise.all([
      this.usersRpcService.getAdminKycSummary(),
      this.shopsRpcService.getAdminVerificationSummary(),
      this.ordersRpcService.getAdminDisputeSummary(),
    ])) as [AdminKycSummaryResponse, AdminShopVerificationSummaryResponse, AdminDisputeSummaryResponse];

    return {
      kyc,
      shops,
      disputes,
    };
  }
}
