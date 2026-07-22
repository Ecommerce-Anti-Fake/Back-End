import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { VoucherDiscountType, VoucherOwnerType, VoucherStatus, Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';

export type CreateVoucherInput = {
  requesterUserId: string;
  ownerType: VoucherOwnerType;
  shopId?: string | null;
  code: string;
  name: string;
  discountType: VoucherDiscountType;
  percentage?: number | null;
  fixedAmount?: number | null;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number;
  scopeType?: string;
  scopeIds?: string[];
  totalUsageLimit?: number | null;
  userUsageLimit?: number | null;
  startsAt: string;
  endsAt: string;
};

@Injectable()
export class VoucherService {
  constructor(private readonly repository: OrdersRepository) {}

  async create(input: CreateVoucherInput) {
    const requester = await this.repository.findUserRole(input.requesterUserId);
    if (!requester) throw new NotFoundException('Không tìm thấy người dùng');
    if (input.ownerType === 'SYSTEM' && requester.role !== 'admin') {
      throw new BadRequestException('Chỉ admin được tạo voucher hệ thống');
    }
    if (input.ownerType === 'SHOP') {
      if (!input.shopId) throw new BadRequestException('Voucher shop cần shopId');
      const shop = await this.repository.findOwnedShop(input.shopId, input.requesterUserId);
      if (!shop) throw new BadRequestException('Bạn không có quyền với shop này');
    }
    if (new Date(input.endsAt) <= new Date(input.startsAt)) {
      throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
    }
    if (input.discountType === 'PERCENTAGE' && (!input.percentage || input.percentage <= 0 || input.percentage > 100)) {
      throw new BadRequestException('Phần trăm giảm phải từ 0 đến 100');
    }
    if (input.discountType === 'FIXED_AMOUNT' && (!input.fixedAmount || input.fixedAmount <= 0)) {
      throw new BadRequestException('Số tiền giảm phải lớn hơn 0');
    }
    if (input.discountType === 'FREE_SHIPPING' && input.fixedAmount) {
      throw new BadRequestException('Voucher miễn phí vận chuyển không dùng fixedAmount');
    }

    return this.repository.createVoucher({
      ownerType: input.ownerType,
      fundingSource: input.ownerType === 'SYSTEM' ? 'PLATFORM' : 'SHOP',
      shop: input.shopId ? { connect: { id: input.shopId } } : undefined,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      discountType: input.discountType,
      percentage: input.percentage == null ? undefined : new Prisma.Decimal(input.percentage),
      fixedAmount: input.fixedAmount == null ? undefined : new Prisma.Decimal(input.fixedAmount),
      maxDiscountAmount: input.maxDiscountAmount == null ? undefined : new Prisma.Decimal(input.maxDiscountAmount),
      minOrderAmount: new Prisma.Decimal(input.minOrderAmount ?? 0),
      scopeType: input.scopeType ?? 'ALL',
      scopeIds: input.scopeIds ?? [],
      totalUsageLimit: input.totalUsageLimit ?? undefined,
      userUsageLimit: input.userUsageLimit ?? undefined,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      status: 'DRAFT',
    });
  }

  async list(input: { requesterUserId: string; ownerType?: VoucherOwnerType; shopId?: string; status?: VoucherStatus; page?: number; pageSize?: number }) {
    const requester = await this.repository.findUserRole(input.requesterUserId);
    if (!requester) throw new NotFoundException('Không tìm thấy người dùng');
    const shopId = input.shopId;
    if (shopId && requester.role !== 'admin' && !(await this.repository.findOwnedShop(shopId, input.requesterUserId))) {
      throw new BadRequestException('Bạn không có quyền với shop này');
    }
    if (input.ownerType === 'SYSTEM' && requester.role !== 'admin') {
      throw new BadRequestException('Chỉ admin được xem voucher hệ thống');
    }
    return this.repository.listVouchers({ ownerType: input.ownerType, shopId, status: input.status, page: input.page ?? 1, pageSize: input.pageSize ?? 20 });
  }

  async updateStatus(input: { requesterUserId: string; voucherId: string; status: VoucherStatus }) {
    const voucher = await this.repository.findVoucherById(input.voucherId);
    if (!voucher) throw new NotFoundException('Không tìm thấy voucher');
    const requester = await this.repository.findUserRole(input.requesterUserId);
    if (!requester) throw new NotFoundException('Không tìm thấy người dùng');
    if (requester.role !== 'admin' && (!voucher.shopId || !(await this.repository.findOwnedShop(voucher.shopId, input.requesterUserId)))) {
      throw new BadRequestException('Bạn không có quyền với voucher này');
    }
    return this.repository.updateVoucher(input.voucherId, { status: input.status });
  }

  async get(input: { requesterUserId: string; voucherId: string }) {
    return this.authorizeVoucher(input.requesterUserId, input.voucherId);
  }

  async update(input: UpdateVoucherInput) {
    const voucher = await this.authorizeVoucher(input.requesterUserId, input.voucherId);
    if (input.startsAt && input.endsAt && new Date(input.endsAt) <= new Date(input.startsAt)) {
      throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
    }
    if (input.discountType === 'PERCENTAGE' && (!input.percentage || input.percentage <= 0 || input.percentage > 100)) {
      throw new BadRequestException('Phần trăm giảm phải từ 0 đến 100');
    }
    if (input.discountType === 'FIXED_AMOUNT' && (!input.fixedAmount || input.fixedAmount <= 0)) {
      throw new BadRequestException('Số tiền giảm phải lớn hơn 0');
    }
    const data: Prisma.VoucherUpdateInput = {
      ...(input.code === undefined ? {} : { code: input.code.trim().toUpperCase() }),
      ...(input.name === undefined ? {} : { name: input.name.trim() }),
      ...(input.discountType === undefined ? {} : { discountType: input.discountType }),
      ...(input.percentage === undefined ? {} : { percentage: input.percentage === null ? null : new Prisma.Decimal(input.percentage) }),
      ...(input.fixedAmount === undefined ? {} : { fixedAmount: input.fixedAmount === null ? null : new Prisma.Decimal(input.fixedAmount) }),
      ...(input.maxDiscountAmount === undefined ? {} : { maxDiscountAmount: input.maxDiscountAmount === null ? null : new Prisma.Decimal(input.maxDiscountAmount) }),
      ...(input.minOrderAmount === undefined ? {} : { minOrderAmount: new Prisma.Decimal(input.minOrderAmount) }),
      ...(input.scopeType === undefined ? {} : { scopeType: input.scopeType }),
      ...(input.scopeIds === undefined ? {} : { scopeIds: input.scopeIds }),
      ...(input.totalUsageLimit === undefined ? {} : { totalUsageLimit: input.totalUsageLimit }),
      ...(input.userUsageLimit === undefined ? {} : { userUsageLimit: input.userUsageLimit }),
      ...(input.startsAt === undefined ? {} : { startsAt: new Date(input.startsAt) }),
      ...(input.endsAt === undefined ? {} : { endsAt: new Date(input.endsAt) }),
    };
    return this.repository.updateVoucher(voucher.id, data);
  }

  async listRedemptions(input: { requesterUserId: string; voucherId: string; page?: number; pageSize?: number }) {
    await this.authorizeVoucher(input.requesterUserId, input.voucherId);
    return this.repository.listVoucherRedemptions({ voucherId: input.voucherId, page: input.page ?? 1, pageSize: input.pageSize ?? 20 });
  }

  private async authorizeVoucher(requesterUserId: string, voucherId: string) {
    const voucher = await this.repository.findVoucherById(voucherId);
    if (!voucher) throw new NotFoundException('Không tìm thấy voucher');
    const requester = await this.repository.findUserRole(requesterUserId);
    if (!requester) throw new NotFoundException('Không tìm thấy người dùng');
    if (requester.role !== 'admin' && (!voucher.shopId || !(await this.repository.findOwnedShop(voucher.shopId, requesterUserId)))) {
      throw new BadRequestException('Bạn không có quyền với voucher này');
    }
    return voucher;
  }
}

export type UpdateVoucherInput = {
  requesterUserId: string;
  voucherId: string;
  code?: string;
  name?: string;
  discountType?: VoucherDiscountType;
  percentage?: number | null;
  fixedAmount?: number | null;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number;
  scopeType?: string;
  scopeIds?: string[];
  totalUsageLimit?: number | null;
  userUsageLimit?: number | null;
  startsAt?: string;
  endsAt?: string;
};
