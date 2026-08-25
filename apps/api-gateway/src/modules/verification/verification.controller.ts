import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  VerifyProductQueryDto,
  VerifyProductResponseDto,
} from '@catalog-metadata';
import { RateLimit } from '../../observability';
import { CatalogRpcService } from '../offer/catalog-rpc.service';

@ApiTags('Verification')
@Controller()
export class VerificationController {
  constructor(private readonly catalogRpcService: CatalogRpcService) {}

  @ApiOperation({ summary: 'Kiem tra ma xac thuc san pham' })
  @ApiOkResponse({
    description: 'Ket qua xac thuc khong lo ma hash hoac thong tin noi bo.',
    type: VerifyProductResponseDto,
  })
  @RateLimit({ profile: 'publicCatalog', limit: 30 })
  @Get('verifications')
  verifyProduct(@Query() query: VerifyProductQueryDto) {
    return this.catalogRpcService.verifyProduct({ code: query.code });
  }
}
