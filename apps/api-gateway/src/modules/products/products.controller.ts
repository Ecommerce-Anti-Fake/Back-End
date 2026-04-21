import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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
  AllocateOfferBatchesDto,
  AddOfferDocumentsBatchDto,
  AddOfferMediaBatchDto,
  BrandResponseDto,
  CategoryResponseDto,
  CreateBrandDto,
  CreateCategoryDto,
  CreateOfferDto,
  CreateProductModelDto,
  GetOfferDocumentUploadSignaturesDto,
  GetOfferMediaUploadSignaturesDto,
  ListOffersQueryDto,
  OfferDocumentResponseDto,
  OfferBatchLinkResponseDto,
  OfferMediaResponseDto,
  OfferMediaUploadSignatureResponseDto,
  OfferResponseDto,
  ProductModelResponseDto,
} from '@products';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import { ProductsRpcService } from './products-rpc.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsRpcService: ProductsRpcService) {}

  @ApiOperation({ summary: 'Lay danh sach product model' })
  @ApiOkResponse({
    description: 'Danh sach product model.',
    type: ProductModelResponseDto,
    isArray: true,
  })
  @Get('models')
  findModels() {
    return this.productsRpcService.findModels();
  }

  @ApiOperation({ summary: 'Lay danh sach brand' })
  @ApiOkResponse({
    description: 'Danh sach brand.',
    type: BrandResponseDto,
    isArray: true,
  })
  @Get('brands')
  findBrands() {
    return this.productsRpcService.findBrands();
  }

  @ApiOperation({ summary: 'Lay danh sach category' })
  @ApiOkResponse({
    description: 'Danh sach category.',
    type: CategoryResponseDto,
    isArray: true,
  })
  @Get('categories')
  findCategories() {
    return this.productsRpcService.findCategories();
  }

  @ApiOperation({ summary: 'Admin tao brand moi' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao brand thanh cong.',
    type: BrandResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Du lieu brand khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen tao brand.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('brands')
  createBrand(@Body() dto: CreateBrandDto) {
    return this.productsRpcService.createBrand({
      name: dto.name,
      registryStatus: dto.registryStatus,
    });
  }

  @ApiOperation({ summary: 'Admin tao category moi' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao category thanh cong.',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Du lieu category khong hop le hoac parent category khong ton tai.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @ApiForbiddenResponse({
    description: 'Chi admin moi co quyen tao category.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.productsRpcService.createCategory({
      name: dto.name,
      parentId: dto.parentId ?? null,
      riskTier: dto.riskTier,
    });
  }

  @ApiOperation({ summary: 'Lay chi tiet mot product model' })
  @ApiParam({ name: 'id', description: 'ID product model can xem.' })
  @ApiOkResponse({
    description: 'Thong tin product model.',
    type: ProductModelResponseDto,
  })
  @Get('models/:id')
  findModelById(@Param('id') id: string) {
    return this.productsRpcService.findModelById({ id });
  }

  @ApiOperation({ summary: 'Admin tao product model moi' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao product model thanh cong.',
    type: ProductModelResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Brand khong ton tai hoac du lieu product model khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('models')
  createModel(@Body() dto: CreateProductModelDto) {
    return this.productsRpcService.createModel({
      brandId: dto.brandId,
      categoryId: dto.categoryId,
      modelName: dto.modelName,
      gtin: dto.gtin ?? null,
      verificationPolicy: dto.verificationPolicy,
      approvalStatus: dto.approvalStatus,
    });
  }

  @ApiOperation({ summary: 'Tao offer moi cho shop hien tai' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao offer thanh cong.',
    type: OfferResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Shop khong thuoc user hien tai hoac du lieu offer khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('offers')
  createOffer(@CurrentUserId() sellerUserId: string, @Body() dto: CreateOfferDto) {
    return this.productsRpcService.createOffer({
      sellerUserId,
      shopId: dto.shopId,
      categoryId: dto.categoryId,
      productModelId: dto.productModelId,
      distributionNodeId: dto.distributionNodeId ?? null,
      title: dto.title,
      description: dto.description,
      price: dto.price,
      currency: dto.currency,
      salesMode: dto.salesMode,
      minWholesaleQty: dto.minWholesaleQty,
      itemCondition: dto.itemCondition,
      availableQuantity: dto.availableQuantity,
      verificationLevel: dto.verificationLevel,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach offer' })
  @ApiOkResponse({
    description: 'Danh sach offer.',
    type: OfferResponseDto,
    isArray: true,
  })
  @Get('offers')
  findOffers(@Query() query: ListOffersQueryDto) {
    return this.productsRpcService.findOffers({
      shopId: query.shopId,
    });
  }

  @ApiOperation({ summary: 'Lay chi tiet mot offer' })
  @ApiParam({ name: 'id', description: 'ID offer can xem.' })
  @ApiOkResponse({
    description: 'Thong tin offer.',
    type: OfferResponseDto,
  })
  @Get('offers/:id')
  findOfferById(@Param('id') id: string) {
    return this.productsRpcService.findOfferById({ id });
  }

  @ApiOperation({ summary: 'Gan supply batch vao offer va dong bo available quantity' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Danh sach batch allocation cua offer.',
    type: OfferBatchLinkResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('offers/:offerId/batch-links')
  allocateOfferBatches(
    @Param('offerId') offerId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: AllocateOfferBatchesDto,
  ) {
    return this.productsRpcService.allocateOfferBatches({
      offerId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach batch allocation cua offer' })
  @ApiOkResponse({
    description: 'Danh sach batch allocation cua offer.',
    type: OfferBatchLinkResponseDto,
    isArray: true,
  })
  @Get('offers/:offerId/batch-links')
  findOfferBatchLinks(@Param('offerId') offerId: string) {
    return this.productsRpcService.findOfferBatchLinks({ offerId });
  }

  @ApiOperation({ summary: 'Lay chu ky upload media cho offer' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Danh sach chu ky upload offer media.',
    type: OfferMediaUploadSignatureResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('offers/:offerId/media/upload-signatures')
  getOfferMediaUploadSignatures(
    @Param('offerId') offerId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: GetOfferMediaUploadSignaturesDto,
  ) {
    return this.productsRpcService.getOfferMediaUploadSignatures({
      offerId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Luu metadata media da upload cho offer' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Danh sach offer media da luu.',
    type: OfferMediaResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('offers/:offerId/media')
  addOfferMediaBatch(
    @Param('offerId') offerId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: AddOfferMediaBatchDto,
  ) {
    return this.productsRpcService.addOfferMediaBatch({
      offerId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach media cua offer' })
  @ApiOkResponse({
    description: 'Danh sach media cua offer.',
    type: OfferMediaResponseDto,
    isArray: true,
  })
  @Get('offers/:offerId/media')
  findOfferMedia(@Param('offerId') offerId: string) {
    return this.productsRpcService.findOfferMedia({ offerId });
  }

  @ApiOperation({ summary: 'Lay chu ky upload tai lieu cho offer' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Danh sach chu ky upload offer documents.',
    type: OfferMediaUploadSignatureResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('offers/:offerId/documents/upload-signatures')
  getOfferDocumentUploadSignatures(
    @Param('offerId') offerId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: GetOfferDocumentUploadSignaturesDto,
  ) {
    return this.productsRpcService.getOfferDocumentUploadSignatures({
      offerId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Luu metadata tai lieu da upload cho offer' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Danh sach tai lieu offer da luu.',
    type: OfferDocumentResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('offers/:offerId/documents')
  addOfferDocumentsBatch(
    @Param('offerId') offerId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: AddOfferDocumentsBatchDto,
  ) {
    return this.productsRpcService.addOfferDocumentsBatch({
      offerId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach tai lieu cua offer' })
  @ApiOkResponse({
    description: 'Danh sach tai lieu cua offer.',
    type: OfferDocumentResponseDto,
    isArray: true,
  })
  @Get('offers/:offerId/documents')
  findOfferDocuments(@Param('offerId') offerId: string) {
    return this.productsRpcService.findOfferDocuments({ offerId });
  }
}
