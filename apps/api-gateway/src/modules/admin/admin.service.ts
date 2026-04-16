import { Injectable } from '@nestjs/common';
import { OrdersRpcService } from '../orders/orders-rpc.service';
import { ShopsRpcService } from '../shops/shops-rpc.service';
import { UsersRpcService } from '../users/users-rpc.service';

type PendingKycPreviewItem = { id: string };
type PendingShopVerificationPreviewItem = { id: string };
type AdminOpenDisputeCountResponse = { openDisputes: number };

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
      PendingKycPreviewItem[],
      PendingShopVerificationPreviewItem[],
      AdminOpenDisputeCountResponse,
    ];

    return {
      counts: {
        pendingKycs: pendingKycs.length,
        pendingShopVerification: pendingVerificationShops.length,
        openDisputes: disputeOverview.openDisputes,
      },
      previews: {
        pendingKycs: pendingKycs.slice(0, 5),
        pendingShopVerification: pendingVerificationShops.slice(0, 5),
      },
    };
  }
}
