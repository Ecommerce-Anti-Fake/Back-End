import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import {
  AddDisputeEvidenceBatchDto,
  DisputeEvidenceResponseDto,
  DisputeEvidenceUploadSignatureResponseDto,
  GetDisputeEvidenceUploadSignaturesDto,
} from '@orders';
import { RateLimit } from '../../observability';
import { OrdersRpcService } from '../order/orders-rpc.service';

@ApiTags('Media')
@Controller('orders')
export class OrderEvidenceController {
  constructor(private readonly ordersRpcService: OrdersRpcService) {}

  @ApiOperation({ summary: 'Lay nhieu chu ky upload evidence cho image, video hoac file raw' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'disputeId', description: 'ID khiieu nai.' })
  @ApiCreatedResponse({
    description: 'Danh sach thong tin ky upload evidence.',
    type: DisputeEvidenceUploadSignatureResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @RateLimit({ profile: 'uploadSignature' })
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
}
