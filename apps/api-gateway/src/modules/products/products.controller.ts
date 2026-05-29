import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
  AddReviewMediaBatchDto,
  BrandResponseDto,
  CategoryResponseDto,
  ChatThreadResponseDto,
  CreateBrandDto,
  CreateCategoryDto,
  CreateOfferDto,
  CreateOfferReviewDto,
  GetOfferDocumentUploadSignaturesDto,
  GetOfferMediaUploadSignaturesDto,
  GetReviewMediaUploadSignaturesDto,
  ListOffersQueryDto,
  OfferDocumentResponseDto,
  OfferBatchLinkResponseDto,
  OfferMediaResponseDto,
  OfferMediaUploadSignatureResponseDto,
  OfferReviewResponseDto,
  OfferReviewsResponseDto,
  OfferResponseDto,
  ReviewMediaResponseDto,
  SendChatMessageDto,
  ShippingCarrierResponseDto,
  StartChatThreadDto,
  UpdateOfferDto,
} from '@products';
import { ActiveUserGuard, CurrentUser, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import type { AuthenticatedUser } from '@contracts';
import { ProductsRpcService } from './products-rpc.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsRpcService: ProductsRpcService) {}

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

  @ApiOperation({ summary: 'Lay danh sach don vi van chuyen co the chon cho offer' })
  @ApiOkResponse({
    description: 'Danh sach don vi van chuyen.',
    type: ShippingCarrierResponseDto,
    isArray: true,
  })
  @Get('shipping-carriers')
  findShippingCarriers() {
    return this.productsRpcService.findShippingCarriers();
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
      brandId: dto.brandId ?? null,
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
      offerStatus: dto.offerStatus,
      shippingProviderCodes: dto.shippingProviderCodes,
      parcelWeightGrams: dto.parcelWeightGrams,
      parcelLengthCm: dto.parcelLengthCm,
      parcelWidthCm: dto.parcelWidthCm,
      parcelHeightCm: dto.parcelHeightCm,
    });
  }

  @ApiOperation({ summary: 'Cap nhat thong tin ban hang cua offer' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Cap nhat offer thanh cong.',
    type: OfferResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch('offers/:offerId')
  updateOffer(
    @Param('offerId') offerId: string,
    @CurrentUserId() sellerUserId: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.productsRpcService.updateOffer({
      offerId,
      sellerUserId,
      title: dto.title,
      description: dto.description,
      price: dto.price,
      availableQuantity: dto.availableQuantity,
      offerStatus: dto.offerStatus,
      shippingProviderCodes: dto.shippingProviderCodes,
      parcelWeightGrams: dto.parcelWeightGrams,
      parcelLengthCm: dto.parcelLengthCm,
      parcelWidthCm: dto.parcelWidthCm,
      parcelHeightCm: dto.parcelHeightCm,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach offer cua shop hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach offer cua seller.',
    type: OfferResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('seller/shops/:shopId/offers')
  findSellerShopOffers(
    @Param('shopId') shopId: string,
    @CurrentUserId() sellerUserId: string,
  ) {
    return this.productsRpcService.findOffers({
      shopId,
      sellerUserId,
      includeInactive: true,
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
      q: query.q,
      categoryId: query.categoryId,
      brandId: query.brandId,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      location: query.location,
      verificationStatus: query.verificationStatus,
      shopType: query.shopType,
      salesChannel: query.salesChannel,
      sort: query.sort,
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

  @ApiOperation({ summary: 'Lay danh sach offer yeu thich cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach ID offer da yeu thich.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('favorites')
  findFavoriteOffers(@CurrentUserId() userId: string) {
    return this.productsRpcService.findFavoriteOffers({ userId });
  }

  @ApiOperation({ summary: 'Them offer vao danh muc yeu thich' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Offer da duoc them vao yeu thich.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('offers/:offerId/favorite')
  addFavoriteOffer(@Param('offerId') offerId: string, @CurrentUserId() userId: string) {
    return this.productsRpcService.addFavoriteOffer({ userId, offerId });
  }

  @ApiOperation({ summary: 'Xoa offer khoi danh muc yeu thich' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Offer da duoc xoa khoi yeu thich.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Delete('offers/:offerId/favorite')
  removeFavoriteOffer(@Param('offerId') offerId: string, @CurrentUserId() userId: string) {
    return this.productsRpcService.removeFavoriteOffer({ userId, offerId });
  }

  @ApiOperation({ summary: 'Lay danh sach chat thread cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach chat thread.',
    type: ChatThreadResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('chat/threads')
  findChatThreads(@CurrentUserId() requesterUserId: string, @CurrentUser() requester?: AuthenticatedUser) {
    return this.productsRpcService.findChatThreads({
      requesterUserId,
      requesterRole: requester?.role,
    });
  }

  @ApiOperation({ summary: 'Lay chi tiet chat thread' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Chi tiet chat thread.',
    type: ChatThreadResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('chat/threads/:threadId')
  getChatThread(
    @Param('threadId') threadId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.productsRpcService.getChatThread({
      threadId,
      requesterUserId,
      requesterRole: requester?.role,
    });
  }

  @ApiOperation({ summary: 'Bat dau chat theo offer' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Chat thread da san sang.',
    type: ChatThreadResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('shops/:shopId/chat-thread')
  startChatThread(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: StartChatThreadDto,
  ) {
    return this.productsRpcService.startChatThread({
      shopId,
      requesterUserId,
      initialMessage: dto.initialMessage ?? null,
    });
  }

  @ApiOperation({ summary: 'Gui tin nhan vao chat thread' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tin nhan da luu.',
    type: ChatThreadResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('chat/threads/:threadId/messages')
  sendChatMessage(
    @Param('threadId') threadId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.productsRpcService.sendChatMessage({
      threadId,
      requesterUserId,
      requesterRole: requester?.role,
      body: dto.body,
      messageType: 'TEXT',
    });
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

  @ApiOperation({ summary: 'Dat media offer lam anh dai dien' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Media offer da duoc dat lam anh dai dien.',
    type: OfferMediaResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch('offers/:offerId/media/:mediaId/primary')
  setOfferPrimaryMedia(
    @Param('offerId') offerId: string,
    @Param('mediaId') mediaId: string,
    @CurrentUserId() requesterUserId: string,
  ) {
    return this.productsRpcService.setOfferPrimaryMedia({
      offerId,
      mediaId,
      requesterUserId,
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

  @ApiOperation({ summary: 'Xoa media cua offer' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Xoa media offer thanh cong.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Delete('offers/:offerId/media/:mediaId')
  deleteOfferMedia(
    @Param('offerId') offerId: string,
    @Param('mediaId') mediaId: string,
    @CurrentUserId() requesterUserId: string,
  ) {
    return this.productsRpcService.deleteOfferMedia({
      offerId,
      mediaId,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach danh gia cua offer' })
  @ApiOkResponse({
    description: 'Danh sach danh gia cua offer.',
    type: OfferReviewsResponseDto,
  })
  @Get('offers/:offerId/reviews')
  findOfferReviews(@Param('offerId') offerId: string) {
    return this.productsRpcService.findOfferReviews({ offerId });
  }

  @ApiOperation({ summary: 'Tao danh gia cho offer da mua' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao danh gia thanh cong.',
    type: OfferReviewResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('offers/:offerId/reviews')
  createOfferReview(
    @Param('offerId') offerId: string,
    @CurrentUserId() fromUserId: string,
    @Body() dto: CreateOfferReviewDto,
  ) {
    return this.productsRpcService.createOfferReview({
      offerId,
      fromUserId,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });
  }

  @ApiOperation({ summary: 'Tao hoac cap nhat danh gia cho mot san pham trong don hang' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao hoac cap nhat danh gia thanh cong.',
    type: OfferReviewResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('order-items/:orderItemId/review')
  createOrderItemReview(
    @Param('orderItemId') orderItemId: string,
    @CurrentUserId() fromUserId: string,
    @Body() dto: CreateOfferReviewDto,
  ) {
    return this.productsRpcService.createOrderItemReview({
      orderItemId,
      fromUserId,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });
  }

  @ApiOperation({ summary: 'Lay chu ky upload anh cho danh gia san pham' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Danh sach chu ky upload anh danh gia.',
    type: OfferMediaUploadSignatureResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('reviews/:reviewId/media/upload-signatures')
  getReviewMediaUploadSignatures(
    @Param('reviewId') reviewId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: GetReviewMediaUploadSignaturesDto,
  ) {
    return this.productsRpcService.getReviewMediaUploadSignatures({
      reviewId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Luu metadata anh da upload cho danh gia san pham' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Danh sach anh danh gia da luu.',
    type: ReviewMediaResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('reviews/:reviewId/media')
  addReviewMediaBatch(
    @Param('reviewId') reviewId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: AddReviewMediaBatchDto,
  ) {
    return this.productsRpcService.addReviewMediaBatch({
      reviewId,
      requesterUserId,
      items: dto.items,
    });
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

  @ApiOperation({ summary: 'Xoa tai lieu cua offer' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Xoa tai lieu offer thanh cong.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Delete('offers/:offerId/documents/:documentId')
  deleteOfferDocument(
    @Param('offerId') offerId: string,
    @Param('documentId') documentId: string,
    @CurrentUserId() requesterUserId: string,
  ) {
    return this.productsRpcService.deleteOfferDocument({
      offerId,
      documentId,
      requesterUserId,
    });
  }
}
