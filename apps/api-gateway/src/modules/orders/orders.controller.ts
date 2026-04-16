import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AddDisputeEvidenceBatchDto,
  AdminDisputeDetailResponseDto,
  AdminOpenDisputeResponseDto,
  AssignAdminDisputeDto,
  CreateRetailOrderDto,
  CreateWholesaleOrderDto,
  DisputeEvidenceResponseDto,
  GetDisputeEvidenceUploadSignaturesDto,
  DisputeEvidenceUploadSignatureResponseDto,
  MarkOrderPaidDto,
  OpenOrderDisputeDto,
  OrderResponseDto,
  ResolveAdminDisputeDto,
  ResolveOrderDisputeDto,
  UpdateAdminDisputeCaseDto,
} from '@orders';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import { OrdersRpcService } from './orders-rpc.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersRpcService: OrdersRpcService) {}

  @ApiOperation({ summary: 'Tao don le tu offer' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao don le thanh cong.',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Offer khong ho tro ban le hoac quantity khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('retail')
  createRetail(@CurrentUserId() buyerUserId: string, @Body() dto: CreateRetailOrderDto) {
    return this.ordersRpcService.createRetail({
      buyerUserId,
      offerId: dto.offerId,
      quantity: dto.quantity,
      affiliateCode: dto.affiliateCode ?? null,
    });
  }

  @ApiOperation({ summary: 'Tao don si giua cac shop' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao don si thanh cong.',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Offer khong ho tro ban si, quantity khong dat nguong, hoac buyer shop khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('wholesale')
  createWholesale(@CurrentUserId() buyerUserId: string, @Body() dto: CreateWholesaleOrderDto) {
    return this.ordersRpcService.createWholesale({
      buyerUserId,
      buyerShopId: dto.buyerShopId,
      buyerDistributionNodeId: dto.buyerDistributionNodeId,
      offerId: dto.offerId,
      quantity: dto.quantity,
      affiliateCode: dto.affiliateCode ?? null,
    });
  }

  @ApiOperation({ summary: 'Lay chi tiet mot don hang' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'ID don hang.' })
  @ApiOkResponse({
    description: 'Thong tin chi tiet don hang.',
    type: OrderResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Khong co quyen xem don hang nay.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':id')
  findById(@Param('id') id: string, @CurrentUserId() requesterUserId: string) {
    return this.ordersRpcService.findById({ id, requesterUserId });
  }

  @ApiOperation({ summary: 'Admin lay danh sach dispute dang mo' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach dispute dang mo.',
    type: AdminOpenDisputeResponseDto,
    isArray: true,
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen truy cap.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/disputes/open')
  findAdminOpenDisputes() {
    return this.ordersRpcService.findAdminOpenDisputes();
  }

  @ApiOperation({ summary: 'Admin lay chi tiet dispute va evidence' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'disputeId', description: 'ID dispute.' })
  @ApiOkResponse({
    description: 'Chi tiet dispute cho admin.',
    type: AdminDisputeDetailResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen truy cap.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/disputes/:disputeId')
  getAdminDisputeDetail(@Param('disputeId') disputeId: string) {
    return this.ordersRpcService.getAdminDisputeDetail({ disputeId });
  }

  @ApiOperation({ summary: 'Admin nhan xu ly dispute' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Admin assign dispute thanh cong.',
    type: AdminDisputeDetailResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen truy cap.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/disputes/:disputeId/assign')
  assignAdminDispute(
    @Param('disputeId') disputeId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: AssignAdminDisputeDto,
  ) {
    return this.ordersRpcService.assignAdminDispute({
      disputeId,
      requesterUserId,
      internalNote: dto.internalNote ?? null,
    });
  }

  @ApiOperation({ summary: 'Admin cap nhat moderation case cua dispute' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Cap nhat moderation case thanh cong.',
    type: AdminDisputeDetailResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen truy cap.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/disputes/:disputeId/case')
  updateAdminDisputeCase(
    @Param('disputeId') disputeId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: UpdateAdminDisputeCaseDto,
  ) {
    return this.ordersRpcService.updateAdminDisputeCase({
      disputeId,
      requesterUserId,
      caseStatus: dto.caseStatus,
      internalNote: dto.internalNote ?? null,
    });
  }

  @ApiOperation({ summary: 'Admin resolve dispute' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Admin resolve dispute thanh cong.',
    type: AdminDisputeDetailResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen truy cap.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/disputes/:disputeId/resolve')
  resolveAdminDispute(
    @Param('disputeId') disputeId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: ResolveAdminDisputeDto,
  ) {
    return this.ordersRpcService.resolveAdminDispute({
      disputeId,
      requesterUserId,
      resolution: dto.resolution,
      internalNote: dto.internalNote ?? null,
    });
  }

  @ApiOperation({ summary: 'Buyer xac nhan don hang da thanh toan' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'ID don hang.' })
  @ApiOkResponse({
    description: 'Cap nhat thanh toan thanh cong.',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Chi don pending moi duoc danh dau da thanh toan.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi buyer moi co quyen danh dau thanh toan.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/mark-paid')
  markPaid(
    @Param('id') id: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: MarkOrderPaidDto,
  ) {
    return this.ordersRpcService.markPaid({
      id,
      requesterUserId,
      providerRef: dto.providerRef ?? null,
    });
  }

  @ApiOperation({ summary: 'Seller xac nhan hoan tat don hang' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'ID don hang.' })
  @ApiOkResponse({
    description: 'Hoan tat don hang thanh cong.',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Chi don paid moi duoc hoan tat.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi seller moi co quyen hoan tat don hang.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/complete')
  complete(@Param('id') id: string, @CurrentUserId() requesterUserId: string) {
    return this.ordersRpcService.complete({
      id,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Buyer hoac seller huy don hang khi con pending' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'ID don hang.' })
  @ApiOkResponse({
    description: 'Huy don hang thanh cong.',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Chi don pending moi duoc huy.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi buyer hoac seller moi co quyen huy don.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUserId() requesterUserId: string) {
    return this.ordersRpcService.cancel({
      id,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Mo khiieu nai cho don da thanh toan hoac da hoan tat' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'ID don hang.' })
  @ApiOkResponse({
    description: 'Mo khiieu nai thanh cong.',
  })
  @ApiBadRequestResponse({
    description: 'Don khong hop le, chua du dieu kien, hoac da co khiieu nai dang mo.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi buyer hoac seller moi co quyen mo khiieu nai.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/disputes')
  openDispute(
    @Param('id') id: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: OpenOrderDisputeDto,
  ) {
    return this.ordersRpcService.openDispute({
      id,
      requesterUserId,
      reason: dto.reason,
    });
  }

  @ApiOperation({ summary: 'Lay nhieu chu ky upload evidence cho image, video hoac file raw' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'disputeId', description: 'ID khiieu nai.' })
  @ApiOkResponse({
    description: 'Danh sach thong tin ky upload evidence.',
    type: DisputeEvidenceUploadSignatureResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi buyer hoac seller cua dispute moi co quyen upload evidence.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('disputes/:disputeId/evidence/upload-signatures')
  getDisputeEvidenceUploadSignatures(
    @Param('disputeId') disputeId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: GetDisputeEvidenceUploadSignaturesDto,
  ) {
    return this.ordersRpcService.getDisputeEvidenceUploadSignatures({
      disputeId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Luu danh sach evidence da upload len Cloudinary' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'disputeId', description: 'ID khiieu nai.' })
  @ApiCreatedResponse({
    description: 'Luu danh sach evidence thanh cong.',
    type: DisputeEvidenceResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Du lieu evidence khong hop le hoac khong thuoc Cloudinary da cau hinh.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi buyer hoac seller cua dispute moi co quyen them evidence.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('disputes/:disputeId/evidence')
  addDisputeEvidence(
    @Param('disputeId') disputeId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: AddDisputeEvidenceBatchDto,
  ) {
    return this.ordersRpcService.addDisputeEvidenceBatch({
      disputeId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach evidence cua dispute' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'disputeId', description: 'ID khiieu nai.' })
  @ApiOkResponse({
    description: 'Danh sach evidence cua dispute.',
    type: DisputeEvidenceResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi buyer hoac seller cua dispute moi co quyen xem evidence.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('disputes/:disputeId/evidence')
  findDisputeEvidence(@Param('disputeId') disputeId: string, @CurrentUserId() requesterUserId: string) {
    return this.ordersRpcService.findDisputeEvidence({
      disputeId,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Seller xu ly khiieu nai dang mo' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'disputeId', description: 'ID khiieu nai.' })
  @ApiOkResponse({
    description: 'Xu ly khiieu nai thanh cong.',
  })
  @ApiBadRequestResponse({
    description: 'Chi khiieu nai OPEN moi duoc xu ly; refund chi ap dung cho don paid.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi seller moi co quyen xu ly khiieu nai.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('disputes/:disputeId/resolve')
  resolveDispute(
    @Param('disputeId') disputeId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: ResolveOrderDisputeDto,
  ) {
    return this.ordersRpcService.resolveDispute({
      disputeId,
      requesterUserId,
      resolution: dto.resolution,
    });
  }

  @ApiOperation({ summary: 'Seller hoan tien cho don da thanh toan' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'id', description: 'ID don hang.' })
  @ApiOkResponse({
    description: 'Hoan tien don hang thanh cong.',
    type: OrderResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Chi don paid moi duoc refund.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi seller moi co quyen refund don.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/refund')
  refund(@Param('id') id: string, @CurrentUserId() requesterUserId: string) {
    return this.ordersRpcService.refund({
      id,
      requesterUserId,
    });
  }
}
