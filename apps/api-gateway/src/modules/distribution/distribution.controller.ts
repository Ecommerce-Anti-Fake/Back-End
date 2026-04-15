import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
  CreateDistributionNetworkDto,
  CreateDistributionNodeDto,
  CreateDistributionPricingPolicyDto,
  CreateDistributionShipmentDto,
  DistributionNetworkResponseDto,
  DistributionNodeResponseDto,
  DistributionPricingPolicyResponseDto,
  DistributionShipmentResponseDto,
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
