import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AddBatchDocumentsBatchDto,
  BatchDocumentUploadSignatureResponseDto,
  BatchDocumentResponseDto,
  CreateSupplyBatchDto,
  GetBatchDocumentUploadSignaturesDto,
  ListSupplyBatchesQueryDto,
  CreateDistributionNetworkDto,
  CreateDistributionNodeDto,
  InviteDistributionNodeDto,
  UpdateDistributionNodeStatusDto,
  CreateDistributionPricingPolicyDto,
  CreateDistributionShipmentDto,
  DistributionNetworkResponseDto,
  DistributionMembershipResponseDto,
  DistributionNodeResponseDto,
  DistributionPricingPolicyResponseDto,
  DistributionShipmentResponseDto,
  InventorySummaryResponseDto,
  SupplyBatchDetailResponseDto,
  SupplyBatchResponseDto,
} from '@distribution';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import { DistributionRpcService } from './distribution-rpc.service';

@ApiTags('Distribution')
@Controller('distribution')
export class DistributionController {
  constructor(private readonly distributionRpcService: DistributionRpcService) {}

  @ApiOperation({ summary: 'Tao distribution network cho manufacturer shop' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao network thanh cong.',
    type: DistributionNetworkResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Manufacturer shop khong hop le hoac network data khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('networks')
  createNetwork(@CurrentUserId() requesterUserId: string, @Body() dto: CreateDistributionNetworkDto) {
    return this.distributionRpcService.createNetwork({
      requesterUserId,
      brandId: dto.brandId,
      manufacturerShopId: dto.manufacturerShopId,
      networkName: dto.networkName,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach distribution network cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach network cua manufacturer shop hien tai.',
    type: DistributionNetworkResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('networks')
  findNetworks(@CurrentUserId() requesterUserId: string) {
    return this.distributionRpcService.findNetworks({ requesterUserId });
  }

  @ApiOperation({ summary: 'Them mot dai ly vao distribution network' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'networkId', description: 'ID distribution network.' })
  @ApiCreatedResponse({
    description: 'Them dai ly vao network thanh cong.',
    type: DistributionNodeResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Node cha hoac agent shop khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('networks/:networkId/nodes')
  createNode(
    @CurrentUserId() requesterUserId: string,
    @Param('networkId') networkId: string,
    @Body() dto: CreateDistributionNodeDto,
  ) {
    return this.distributionRpcService.createNode({
      requesterUserId,
      networkId,
      shopId: dto.shopId,
      parentNodeId: dto.parentNodeId,
    });
  }

  @ApiOperation({ summary: 'Gui loi moi dai ly tham gia distribution network' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'networkId', description: 'ID distribution network.' })
  @ApiCreatedResponse({
    description: 'Tao loi moi dai ly thanh cong.',
    type: DistributionNodeResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('networks/:networkId/invitations')
  inviteNode(
    @CurrentUserId() requesterUserId: string,
    @Param('networkId') networkId: string,
    @Body() dto: InviteDistributionNodeDto,
  ) {
    return this.distributionRpcService.inviteNode({
      requesterUserId,
      networkId,
      shopId: dto.shopId,
      parentNodeId: dto.parentNodeId,
    });
  }

  @ApiOperation({ summary: 'Chu dai ly chap nhan loi moi tham gia network' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'nodeId', description: 'ID distribution node invitation.' })
  @ApiOkResponse({
    description: 'Chap nhan loi moi thanh cong.',
    type: DistributionNodeResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('nodes/:nodeId/accept-invitation')
  acceptNodeInvitation(@CurrentUserId() requesterUserId: string, @Param('nodeId') nodeId: string) {
    return this.distributionRpcService.acceptNodeInvitation({
      requesterUserId,
      nodeId,
    });
  }

  @ApiOperation({ summary: 'Chu dai ly tu choi loi moi tham gia network' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'nodeId', description: 'ID distribution node invitation.' })
  @ApiOkResponse({
    description: 'Tu choi loi moi thanh cong.',
    type: DistributionNodeResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('nodes/:nodeId/decline-invitation')
  declineNodeInvitation(@CurrentUserId() requesterUserId: string, @Param('nodeId') nodeId: string) {
    return this.distributionRpcService.declineNodeInvitation({
      requesterUserId,
      nodeId,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach loi moi distribution cua shop hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach loi moi dang cho chap nhan.',
    type: DistributionNodeResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('my-invitations')
  findMyInvitations(@CurrentUserId() requesterUserId: string) {
    return this.distributionRpcService.findMyInvitations({
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach tham gia mang phan phoi cua dai ly hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach membership cua distributor hien tai.',
    type: DistributionMembershipResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('my-memberships')
  findMyMemberships(@CurrentUserId() requesterUserId: string) {
    return this.distributionRpcService.findMyMemberships({
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Cap nhat trang thai quan he cua dai ly trong network' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'networkId', description: 'ID distribution network.' })
  @ApiParam({ name: 'nodeId', description: 'ID distribution node.' })
  @ApiOkResponse({
    description: 'Cap nhat trang thai node thanh cong.',
    type: DistributionNodeResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('networks/:networkId/nodes/:nodeId/status')
  updateNodeStatus(
    @CurrentUserId() requesterUserId: string,
    @Param('networkId') networkId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: UpdateDistributionNodeStatusDto,
  ) {
    return this.distributionRpcService.updateNodeStatus({
      requesterUserId,
      networkId,
      nodeId,
      relationshipStatus: dto.relationshipStatus,
    });
  }

  @ApiOperation({ summary: 'Tao supply batch cho shop hien tai' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao supply batch thanh cong.',
    type: SupplyBatchResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('batches')
  createBatch(@CurrentUserId() requesterUserId: string, @Body() dto: CreateSupplyBatchDto) {
    return this.distributionRpcService.createBatch({
      requesterUserId,
      shopId: dto.shopId,
      productModelId: dto.productModelId,
      distributionNodeId: dto.distributionNodeId ?? null,
      batchNumber: dto.batchNumber,
      quantity: dto.quantity,
      sourceName: dto.sourceName,
      countryOfOrigin: dto.countryOfOrigin,
      sourceType: dto.sourceType,
      receivedAt: dto.receivedAt,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach supply batch cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach supply batch.',
    type: SupplyBatchResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('batches')
  findBatches(@CurrentUserId() requesterUserId: string, @Query() query: ListSupplyBatchesQueryDto) {
    return this.distributionRpcService.findBatches({
      requesterUserId,
      shopId: query.shopId,
    });
  }

  @ApiOperation({ summary: 'Lay chi tiet inventory cua supply batch' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'batchId', description: 'ID supply batch.' })
  @ApiOkResponse({
    description: 'Chi tiet batch, allocation, consumption va shipment history.',
    type: SupplyBatchDetailResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('batches/:batchId')
  getBatchDetail(@CurrentUserId() requesterUserId: string, @Param('batchId') batchId: string) {
    return this.distributionRpcService.getBatchDetail({
      requesterUserId,
      batchId,
    });
  }

  @ApiOperation({ summary: 'Lay tong quan inventory theo shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Tong quan ton kho, allocation va consumption theo batch/offer.',
    type: InventorySummaryResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('inventory-summary')
  getInventorySummary(@CurrentUserId() requesterUserId: string, @Query() query: ListSupplyBatchesQueryDto) {
    return this.distributionRpcService.getInventorySummary({
      requesterUserId,
      shopId: query.shopId,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach node cua distribution network' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'networkId', description: 'ID distribution network.' })
  @ApiOkResponse({
    description: 'Danh sach node cua network.',
    type: DistributionNodeResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('networks/:networkId/nodes')
  findNodesByNetwork(@CurrentUserId() requesterUserId: string, @Param('networkId') networkId: string) {
    return this.distributionRpcService.findNodesByNetwork({
      requesterUserId,
      networkId,
    });
  }

  @ApiOperation({ summary: 'Tao shipment giua hai distribution node' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'networkId', description: 'ID distribution network.' })
  @ApiCreatedResponse({
    description: 'Tao shipment thanh cong.',
    type: DistributionShipmentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Shipment data, node hoac batch khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('networks/:networkId/shipments')
  createShipment(
    @CurrentUserId() requesterUserId: string,
    @Param('networkId') networkId: string,
    @Body() dto: CreateDistributionShipmentDto,
  ) {
    return this.distributionRpcService.createShipment({
      requesterUserId,
      networkId,
      fromNodeId: dto.fromNodeId,
      toNodeId: dto.toNodeId,
      shipmentCode: dto.shipmentCode,
      note: dto.note ?? null,
      items: dto.items.map((item) => ({
        batchId: item.batchId,
        productModelId: item.productModelId,
        quantity: item.quantity,
        unitCost: item.unitCost ?? null,
      })),
    });
  }

  @ApiOperation({ summary: 'Dispatch shipment de bat dau van chuyen' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'shipmentId', description: 'ID shipment.' })
  @ApiOkResponse({
    description: 'Dispatch shipment thanh cong.',
    type: DistributionShipmentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Chi shipment o trang thai draft moi duoc dispatch.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('shipments/:shipmentId/dispatch')
  dispatchShipment(@CurrentUserId() requesterUserId: string, @Param('shipmentId') shipmentId: string) {
    return this.distributionRpcService.dispatchShipment({
      requesterUserId,
      shipmentId,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach shipment cua distribution network' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'networkId', description: 'ID distribution network.' })
  @ApiOkResponse({
    description: 'Danh sach shipment cua network.',
    type: DistributionShipmentResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('networks/:networkId/shipments')
  findShipmentsByNetwork(@CurrentUserId() requesterUserId: string, @Param('networkId') networkId: string) {
    return this.distributionRpcService.findShipmentsByNetwork({
      requesterUserId,
      networkId,
    });
  }

  @ApiOperation({ summary: 'Xac nhan shipment da duoc nhan' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'shipmentId', description: 'ID shipment.' })
  @ApiOkResponse({
    description: 'Xac nhan nhan shipment thanh cong.',
    type: DistributionShipmentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Shipment khong hop le hoac khong o trang thai in-transit.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('shipments/:shipmentId/receive')
  receiveShipment(@CurrentUserId() requesterUserId: string, @Param('shipmentId') shipmentId: string) {
    return this.distributionRpcService.receiveShipment({
      requesterUserId,
      shipmentId,
    });
  }

  @ApiOperation({ summary: 'Huy shipment khi chua dispatch' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'shipmentId', description: 'ID shipment.' })
  @ApiOkResponse({
    description: 'Huy shipment thanh cong.',
    type: DistributionShipmentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Chi shipment o trang thai draft moi duoc huy.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('shipments/:shipmentId/cancel')
  cancelShipment(@CurrentUserId() requesterUserId: string, @Param('shipmentId') shipmentId: string) {
    return this.distributionRpcService.cancelShipment({
      requesterUserId,
      shipmentId,
    });
  }

  @ApiOperation({ summary: 'Lay chu ky upload tai lieu cho supply batch' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'batchId', description: 'ID supply batch.' })
  @ApiCreatedResponse({
    description: 'Danh sach chu ky upload batch documents.',
    type: BatchDocumentUploadSignatureResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('batches/:batchId/documents/upload-signatures')
  getBatchDocumentUploadSignatures(
    @CurrentUserId() requesterUserId: string,
    @Param('batchId') batchId: string,
    @Body() dto: GetBatchDocumentUploadSignaturesDto,
  ) {
    return this.distributionRpcService.getBatchDocumentUploadSignatures({
      batchId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Luu metadata tai lieu da upload cho supply batch' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'batchId', description: 'ID supply batch.' })
  @ApiCreatedResponse({
    description: 'Danh sach batch documents da luu.',
    type: BatchDocumentResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('batches/:batchId/documents')
  addBatchDocumentsBatch(
    @CurrentUserId() requesterUserId: string,
    @Param('batchId') batchId: string,
    @Body() dto: AddBatchDocumentsBatchDto,
  ) {
    return this.distributionRpcService.addBatchDocumentsBatch({
      batchId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach tai lieu cua supply batch' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'batchId', description: 'ID supply batch.' })
  @ApiOkResponse({
    description: 'Danh sach tai lieu cua supply batch.',
    type: BatchDocumentResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('batches/:batchId/documents')
  findBatchDocuments(@CurrentUserId() requesterUserId: string, @Param('batchId') batchId: string) {
    return this.distributionRpcService.findBatchDocuments({
      batchId,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Tao pricing policy cho distribution network' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao pricing policy thanh cong.',
    type: DistributionPricingPolicyResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Pricing policy khong hop le hoac vi pham rule chiet khau.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('pricing-policies')
  createPricingPolicy(@CurrentUserId() requesterUserId: string, @Body() dto: CreateDistributionPricingPolicyDto) {
    return this.distributionRpcService.createPricingPolicy({
      requesterUserId,
      networkId: dto.networkId,
      scope: dto.scope,
      nodeId: dto.nodeId ?? null,
      appliesToLevel: dto.appliesToLevel ?? null,
      productModelId: dto.productModelId ?? null,
      categoryId: dto.categoryId ?? null,
      discountValue: dto.discountValue,
      minQuantity: dto.minQuantity ?? null,
      priority: dto.priority,
      startsAt: dto.startsAt ?? null,
      endsAt: dto.endsAt ?? null,
    });
  }

  @ApiOperation({ summary: 'Lay pricing policies cua mot network' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'networkId', description: 'ID distribution network.' })
  @ApiOkResponse({
    description: 'Danh sach pricing policy cua network.',
    type: DistributionPricingPolicyResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('networks/:networkId/pricing-policies')
  findPricingPoliciesByNetwork(@CurrentUserId() requesterUserId: string, @Param('networkId') networkId: string) {
    return this.distributionRpcService.findPricingPoliciesByNetwork({
      requesterUserId,
      networkId,
    });
  }
}
