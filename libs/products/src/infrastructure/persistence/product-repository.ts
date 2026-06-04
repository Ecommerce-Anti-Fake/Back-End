import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllBrands() {
    return this.prisma.brand.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  createBrand(data: {
    name: string;
    registryStatus: string;
  }) {
    return this.prisma.brand.create({
      data,
    });
  }

  findAllCategories() {
    return this.prisma.category.findMany({
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
  }

  findActiveShippingCarriers() {
    return this.prisma.shippingCarrier.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findActiveShippingCarriersByCodes(codes: string[]) {
    return this.prisma.shippingCarrier.findMany({
      where: {
        code: { in: codes },
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  createCategory(data: {
    name: string;
    parentId: string | null;
    riskTier: string;
  }) {
    return this.prisma.category.create({
      data,
    });
  }

  findBrandById(id: string) {
    return this.prisma.brand.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });
  }

  findCategoryById(id: string) {
    return this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  findOwnedShop(shopId: string, ownerUserId: string) {
    return this.prisma.shop.findFirst({
      where: {
        id: shopId,
        ownerUserId,
      },
      select: {
        id: true,
        shopStatus: true,
        registrationType: true,
      },
    });
  }

  findApprovedShopCategoryRegistration(shopId: string, categoryId: string) {
    return this.prisma.shopBusinessCategory.findFirst({
      where: {
        shopId,
        categoryId,
        registrationStatus: 'approved',
      },
      select: {
        id: true,
      },
    });
  }

  findOwnedDistributionNode(nodeId: string, shopId: string, ownerUserId: string) {
    return this.prisma.distributionNode.findFirst({
      where: {
        id: nodeId,
        shopId,
        shop: {
          ownerUserId,
        },
      },
      select: {
        id: true,
        relationshipStatus: true,
      },
    });
  }

  createOffer(data: {
    sellerUserId: string;
    shopId: string;
    categoryId: string;
    brandId: string;
    distributionNodeId: string | null;
    modelName: string;
    gtin: string | null;
    verificationPolicy: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    salesMode: 'RETAIL' | 'WHOLESALE' | 'BOTH';
    minWholesaleQty: number | null;
    itemCondition: string;
    availableQuantity: number;
    verificationLevel: string;
    offerStatus: string;
    parcelWeightGrams?: number | null;
    parcelLengthCm?: number | null;
    parcelWidthCm?: number | null;
    parcelHeightCm?: number | null;
    shippingProviderCodes?: string[];
  }) {
    const { shippingProviderCodes, ...offerData } = data;
    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.offer.create({
        data: offerData,
      });

      await this.replaceOfferShippingMethodsTx(tx, offer.id, shippingProviderCodes?.length ? shippingProviderCodes : ['SELF_DELIVERY']);

      return tx.offer.findUniqueOrThrow({
        where: { id: offer.id },
        include: this.offerResponseInclude(),
      });
    });
  }

  private offerResponseInclude() {
    return {
      shop: {
        select: { shopName: true, registrationType: true },
      },
      category: {
        select: { name: true },
      },
      brand: {
        select: { name: true },
      },
      distributionNode: {
        select: { networkId: true },
      },
      media: {
        orderBy: { createdAt: 'asc' as const },
        select: {
          mediaType: true,
          fileUrl: true,
          mediaAsset: {
            select: { secureUrl: true },
          },
        },
      },
      shippingMethods: {
        where: { isEnabled: true },
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }

  private async replaceOfferShippingMethodsTx(tx: Prisma.TransactionClient, offerId: string, providerCodes: string[]) {
    const normalizedCodes = Array.from(new Set(providerCodes.map((code) => code.trim().toUpperCase()).filter(Boolean)));
    const effectiveCodes = normalizedCodes.length ? normalizedCodes : ['SELF_DELIVERY'];
    const carriers = await tx.shippingCarrier.findMany({
      where: {
        code: { in: effectiveCodes },
        isActive: true,
      },
    });

    await tx.offerShippingMethod.deleteMany({ where: { offerId } });
    await tx.offerShippingMethod.createMany({
      data: carriers.map((carrier) => ({
        offerId,
        carrierId: carrier.id,
        providerCode: carrier.code,
        providerName: carrier.name,
        shippingFee: 0,
      })),
    });
  }

  replaceOfferShippingMethods(offerId: string, providerCodes: string[]) {
    return this.prisma.$transaction(async (tx) => {
      await this.replaceOfferShippingMethodsTx(tx, offerId, providerCodes);

      return tx.offer.findUniqueOrThrow({
        where: { id: offerId },
        include: this.offerResponseInclude(),
      });
    });
  }

  getOfferWithRelations(offerId: string) {
    return this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        shop: {
          select: { shopName: true, registrationType: true },
        },
        category: {
          select: { name: true },
        },
        distributionNode: {
          select: { networkId: true },
        },
        shippingMethods: {
          where: { isEnabled: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  findAllOffers(
    input: {
      shopId?: string;
      sellerUserId?: string;
      includeInactive?: boolean;
      q?: string;
      categoryId?: string;
      brandId?: string;
      minPrice?: number;
      maxPrice?: number;
      location?: string;
      verificationStatus?: string;
      shopType?: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
      salesChannel?: 'retail' | 'wholesale' | 'all';
      sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc';
    } = {},
  ) {
    const q = input.q?.trim();
    const location = input.location?.trim();
    const salesMode = this.resolveSalesModeFilter(input.salesChannel);
    const shopWhere: Prisma.ShopWhereInput = {
      ...(input.sellerUserId ? { ownerUserId: input.sellerUserId } : {}),
      ...(input.shopType ? { registrationType: input.shopType } : {}),
    };
    const where: Prisma.OfferWhereInput = {
      ...(input.shopId ? { shopId: input.shopId } : {}),
      ...(Object.keys(shopWhere).length ? { shop: { is: shopWhere } } : {}),
      ...(!input.includeInactive ? { offerStatus: 'active' } : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.brandId ? { brandId: input.brandId } : {}),
      ...(input.verificationStatus ? { verificationLevel: input.verificationStatus } : {}),
      ...(salesMode ? { salesMode } : {}),
      ...(input.minPrice !== undefined || input.maxPrice !== undefined
        ? {
            price: {
              ...(input.minPrice !== undefined ? { gte: input.minPrice } : {}),
              ...(input.maxPrice !== undefined ? { lte: input.maxPrice } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { shop: { is: { shopName: { contains: q, mode: 'insensitive' } } } },
              { category: { is: { name: { contains: q, mode: 'insensitive' } } } },
              { modelName: { contains: q, mode: 'insensitive' } },
              { brand: { is: { name: { contains: q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
      ...(location
        ? {
            batchLinks: {
              some: {
                batch: {
                  OR: [
                    { countryOfOrigin: { contains: location, mode: 'insensitive' } },
                    { sourceName: { contains: location, mode: 'insensitive' } },
                  ],
                },
              },
            },
          }
        : {}),
    };

    return this.prisma.offer.findMany({
      where,
      include: {
        shop: {
          select: { shopName: true, registrationType: true },
        },
        category: {
          select: { name: true },
        },
        distributionNode: {
          select: { networkId: true },
        },
        media: {
          orderBy: { createdAt: 'asc' },
          select: {
            mediaType: true,
            fileUrl: true,
            mediaAsset: {
              select: { secureUrl: true },
            },
          },
        },
        shippingMethods: {
          where: { isEnabled: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: this.resolveOfferSort(input.sort),
    });
  }

  private resolveSalesModeFilter(salesChannel?: 'retail' | 'wholesale' | 'all'): Prisma.EnumOfferSalesModeFilter | undefined {
    if (salesChannel === 'retail') {
      return { in: ['RETAIL', 'BOTH'] };
    }
    if (salesChannel === 'wholesale') {
      return { in: ['WHOLESALE', 'BOTH'] };
    }

    return undefined;
  }

  private resolveOfferSort(sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc'): Prisma.OfferOrderByWithRelationInput {
    if (sort === 'price-asc') {
      return { price: 'asc' };
    }
    if (sort === 'price-desc') {
      return { price: 'desc' };
    }

    return { createdAt: 'desc' };
  }

  findOfferById(id: string) {
    return this.prisma.offer.findUnique({
      where: { id },
      include: {
        shop: {
          select: { shopName: true, registrationType: true },
        },
        category: {
          select: { name: true },
        },
        distributionNode: {
          select: { networkId: true },
        },
        media: {
          orderBy: { createdAt: 'asc' },
          select: {
            mediaType: true,
            fileUrl: true,
            mediaAsset: {
              select: { secureUrl: true },
            },
          },
        },
        shippingMethods: {
          where: { isEnabled: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async listFavoriteOfferIds(userId: string) {
    const favorites = await this.prisma.userFavoriteOffer.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { offerId: true },
    });

    return favorites.map((favorite) => favorite.offerId);
  }

  async addFavoriteOffer(userId: string, offerId: string) {
    await this.prisma.offer.findUniqueOrThrow({
      where: { id: offerId },
      select: { id: true },
    });

    await this.prisma.userFavoriteOffer.upsert({
      where: {
        userId_offerId: {
          userId,
          offerId,
        },
      },
      update: {},
      create: {
        userId,
        offerId,
      },
    });

    return { offerId, isFavorite: true };
  }

  async removeFavoriteOffer(userId: string, offerId: string) {
    await this.prisma.userFavoriteOffer.deleteMany({
      where: {
        userId,
        offerId,
      },
    });

    return { offerId, isFavorite: false };
  }

  findOwnedOffer(offerId: string, sellerUserId: string) {
    return this.prisma.offer.findFirst({
      where: {
        id: offerId,
        sellerUserId,
      },
      include: {
        shop: {
          select: {
            id: true,
            shopStatus: true,
            registrationType: true,
          },
        },
        distributionNode: {
          select: {
            id: true,
            relationshipStatus: true,
            shop: {
              select: {
                shopStatus: true,
              },
            },
          },
        },
        batchLinks: {
          select: {
            allocatedQuantity: true,
            batch: {
              select: {
                distributionNodeId: true,
                sourceType: true,
              },
            },
          },
        },
        shippingMethods: {
          where: { isEnabled: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  findShopForChat(shopId: string) {
    return this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        shopName: true,
        ownerUserId: true,
      },
    });
  }

  findChatThreadByShopAndBuyer(shopId: string, buyerUserId: string) {
    return this.prisma.chatThread.findFirst({
      where: { shopId, buyerUserId },
      include: this.chatThreadInclude(),
    });
  }

  findChatThreadById(threadId: string) {
    return this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: this.chatThreadInclude(),
    });
  }

  findChatThreadsForUser(input: { requesterUserId: string; requesterRole?: string | null }) {
    return this.prisma.chatThread.findMany({
      where:
        input.requesterRole === 'admin'
          ? {}
          : {
              OR: [{ buyerUserId: input.requesterUserId }, { sellerUserId: input.requesterUserId }],
            },
      include: this.chatThreadInclude(1),
      orderBy: { createdAt: 'desc' },
    });
  }

  createChatThread(input: { shopId: string; buyerUserId: string; sellerUserId: string }) {
    return this.prisma.chatThread.create({
      data: input,
      include: this.chatThreadInclude(),
    });
  }

  async createChatMessage(input: {
    threadId: string;
    senderUserId: string;
    clientMessageId?: string | null;
    body: string;
    messageType: 'TEXT';
  }) {
    const existingMessage = input.clientMessageId
      ? await this.prisma.chatMessage.findFirst({
          where: {
            threadId: input.threadId,
            clientMessageId: input.clientMessageId,
          },
        })
      : null;

    if (existingMessage) {
      return this.findChatThreadById(input.threadId);
    }

    const message = await this.prisma.chatMessage.create({
      data: input,
      include: {
        sender: {
          select: {
            displayName: true,
            email: true,
            phone: true,
          },
        },
        thread: {
          select: {
            buyerUserId: true,
            sellerUserId: true,
          },
        },
      },
    });

    const recipientUserId =
      message.senderUserId === message.thread.buyerUserId ? message.thread.sellerUserId : message.thread.buyerUserId;
    await this.createNotification({
      userId: recipientUserId,
      notificationType: 'CHAT_MESSAGE',
      title: `Tin nhan moi tu ${message.sender.displayName || message.sender.email || message.sender.phone || 'nguoi dung'}`,
      body: message.body.length > 120 ? `${message.body.slice(0, 117)}...` : message.body,
      targetType: 'CHAT_THREAD',
      targetId: input.threadId,
      dedupeKey: `CHAT_MESSAGE:${message.id}:${recipientUserId}`,
    });

    return this.findChatThreadById(input.threadId);
  }

  listSocialPosts(input: { requesterUserId?: string | null; includeHidden?: boolean; page?: number; pageSize?: number }) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));

    return this.prisma.socialPost.findMany({
      where: input.includeHidden ? {} : { visibility: 'PUBLIC' },
      include: this.socialPostInclude(input.requesterUserId),
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  countSocialPostsSince(input: { authorUserId: string; authorShopId?: string | null; since: Date }) {
    return this.prisma.socialPost.count({
      where: {
        authorUserId: input.authorUserId,
        authorShopId: input.authorShopId ?? null,
        createdAt: { gte: input.since },
      },
    });
  }

  findShopForSocialPost(shopId: string) {
    return this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        ownerUserId: true,
        shopName: true,
        shopStatus: true,
      },
    });
  }

  findOfferForSocialPost(offerId: string) {
    return this.prisma.offer.findUnique({
      where: { id: offerId },
      select: {
        id: true,
        offerStatus: true,
      },
    });
  }

  createSocialPost(input: {
    authorUserId: string;
    authorShopId?: string | null;
    offerId?: string | null;
    postType: 'SHARE' | 'QUESTION' | 'PRODUCT_SHARE';
    body: string;
  }) {
    return this.prisma.socialPost.create({
      data: {
        authorUserId: input.authorUserId,
        authorShopId: input.authorShopId ?? null,
        offerId: input.offerId ?? null,
        postType: input.postType,
        body: input.body,
      },
      include: this.socialPostInclude(input.authorUserId),
    });
  }

  findSocialPostById(postId: string, requesterUserId?: string | null) {
    return this.prisma.socialPost.findUnique({
      where: { id: postId },
      include: this.socialPostInclude(requesterUserId),
    });
  }

  async createSocialComment(input: { postId: string; authorUserId: string; body: string }) {
    await this.prisma.socialComment.create({
      data: input,
    });

    return this.findSocialPostById(input.postId, input.authorUserId);
  }

  async setSocialReaction(input: { postId: string; userId: string; reactionType?: 'LIKE' }) {
    await this.prisma.socialReaction.upsert({
      where: {
        postId_userId_reactionType: {
          postId: input.postId,
          userId: input.userId,
          reactionType: input.reactionType ?? 'LIKE',
        },
      },
      create: {
        postId: input.postId,
        userId: input.userId,
        reactionType: input.reactionType ?? 'LIKE',
      },
      update: {},
    });

    return this.findSocialPostById(input.postId, input.userId);
  }

  async removeSocialReaction(input: { postId: string; userId: string; reactionType?: 'LIKE' }) {
    await this.prisma.socialReaction.deleteMany({
      where: {
        postId: input.postId,
        userId: input.userId,
        reactionType: input.reactionType ?? 'LIKE',
      },
    });

    return this.findSocialPostById(input.postId, input.userId);
  }

  async shareSocialPost(input: { postId: string; userId: string }) {
    await this.prisma.socialShare.upsert({
      where: {
        postId_userId: {
          postId: input.postId,
          userId: input.userId,
        },
      },
      create: input,
      update: {},
    });

    return this.findSocialPostById(input.postId, input.userId);
  }

  updateSocialPostVisibility(input: { postId: string; requesterUserId: string; visibility: 'PUBLIC' | 'HIDDEN' }) {
    return this.prisma.socialPost.update({
      where: { id: input.postId },
      data: {
        visibility: input.visibility,
        hiddenAt: input.visibility === 'HIDDEN' ? new Date() : null,
        hiddenByUserId: input.visibility === 'HIDDEN' ? input.requesterUserId : null,
      },
      include: this.socialPostInclude(input.requesterUserId),
    });
  }

  listLiveSessions(input: { requesterUserId?: string | null; filter?: 'all' | 'live' | 'upcoming'; q?: string | null }) {
    const now = new Date();
    const search = input.q?.trim();
    const statusWhere =
      input.filter === 'live'
        ? { status: 'LIVE' as const }
        : input.filter === 'upcoming'
          ? { status: 'SCHEDULED' as const, startAt: { gte: now } }
          : { status: { not: 'CANCELLED' as const } };

    return this.prisma.liveCommerceSession.findMany({
      where: {
        ...statusWhere,
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' as const } },
                { description: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: this.liveSessionInclude(input.requesterUserId),
      orderBy: [{ status: 'asc' }, { startAt: 'asc' }],
      take: 50,
    });
  }

  findShopForLiveSession(shopId: string) {
    return this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        ownerUserId: true,
        shopName: true,
        shopStatus: true,
      },
    });
  }

  findOffersForLiveSession(offerIds: string[]) {
    return this.prisma.offer.findMany({
      where: { id: { in: offerIds } },
      select: {
        id: true,
        shopId: true,
        offerStatus: true,
        availableQuantity: true,
      },
    });
  }

  createLiveSession(input: {
    shopId: string;
    title: string;
    description?: string | null;
    coverUrl?: string | null;
    startAt: Date;
    playbackUrl?: string | null;
    offerIds: string[];
    requesterUserId: string;
  }) {
    return this.prisma.liveCommerceSession.create({
      data: {
        shopId: input.shopId,
        title: input.title,
        description: input.description ?? null,
        coverUrl: input.coverUrl ?? null,
        startAt: input.startAt,
        playbackUrl: input.playbackUrl ?? null,
        offers: {
          create: input.offerIds.map((offerId, index) => ({
            offerId,
            sortOrder: index,
          })),
        },
      },
      include: this.liveSessionInclude(input.requesterUserId),
    });
  }

  findLiveSessionById(sessionId: string, requesterUserId?: string | null) {
    return this.prisma.liveCommerceSession.findUnique({
      where: { id: sessionId },
      include: this.liveSessionInclude(requesterUserId),
    });
  }

  updateLiveSessionStatus(input: { sessionId: string; status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED'; requesterUserId: string }) {
    return this.prisma.liveCommerceSession.update({
      where: { id: input.sessionId },
      data: { status: input.status },
      include: this.liveSessionInclude(input.requesterUserId),
    });
  }

  async remindLiveSession(input: { sessionId: string; userId: string }) {
    await this.prisma.liveSessionReminder.upsert({
      where: {
        sessionId_userId: {
          sessionId: input.sessionId,
          userId: input.userId,
        },
      },
      create: input,
      update: {},
    });

    return this.findLiveSessionById(input.sessionId, input.userId);
  }

  private createNotification(input: {
    userId: string;
    notificationType: string;
    title: string;
    body: string;
    targetType: string;
    targetId: string;
    dedupeKey: string;
  }) {
    return this.prisma.notification.upsert({
      where: { dedupeKey: input.dedupeKey },
      create: input,
      update: {},
    });
  }

  private chatThreadInclude(messageTake?: number) {
    return {
      shop: {
        select: {
          shopName: true,
        },
      },
      buyer: {
        select: {
          displayName: true,
          email: true,
          phone: true,
        },
      },
      seller: {
        select: {
          displayName: true,
          email: true,
          phone: true,
        },
      },
      messages: {
        ...(messageTake ? { take: messageTake } : {}),
        orderBy: { sentAt: 'asc' as const },
        include: {
          sender: {
            select: {
              displayName: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    };
  }

  private socialPostInclude(requesterUserId?: string | null) {
    return {
      author: {
        select: {
          displayName: true,
          email: true,
          phone: true,
        },
      },
      authorShop: {
        select: {
          shopName: true,
        },
      },
      comments: {
        where: { visibility: 'PUBLIC' as const },
        orderBy: { createdAt: 'asc' as const },
        take: 3,
        include: {
          author: {
            select: {
              displayName: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      reactions: requesterUserId
        ? {
            where: {
              userId: requesterUserId,
              reactionType: 'LIKE' as const,
            },
            select: {
              userId: true,
              reactionType: true,
            },
          }
        : {
            take: 0,
            select: {
              userId: true,
              reactionType: true,
            },
          },
      _count: {
        select: {
          comments: true,
          reactions: true,
          shares: true,
        },
      },
    };
  }

  private liveSessionInclude(requesterUserId?: string | null) {
    return {
      shop: {
        select: {
          shopName: true,
        },
      },
      offers: {
        orderBy: {
          sortOrder: 'asc' as const,
        },
        include: {
          offer: {
            include: {
              media: {
                include: {
                  mediaAsset: true,
                },
                orderBy: {
                  createdAt: 'desc' as const,
                },
              },
            },
          },
        },
      },
      reminders: requesterUserId
        ? {
            where: {
              userId: requesterUserId,
            },
          }
        : false,
      _count: {
        select: {
          reminders: true,
        },
      },
    };
  }

  updateOwnedOffer(
    offerId: string,
    sellerUserId: string,
    data: {
      title?: string;
      description?: string;
      price?: number;
      availableQuantity?: number;
      offerStatus?: string;
    },
  ) {
    return this.prisma.offer.update({
      where: {
        id: offerId,
        sellerUserId,
      },
      data,
      include: {
        shop: {
          select: { shopName: true, registrationType: true },
        },
        category: {
          select: { name: true },
        },
        media: {
          orderBy: { createdAt: 'asc' },
          select: {
            mediaType: true,
            fileUrl: true,
            mediaAsset: {
              select: { secureUrl: true },
            },
          },
        },
        shippingMethods: {
          where: { isEnabled: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  findAllocatableBatches(
    batchIds: string[],
    shopId: string,
    identity: {
      brandId: string;
      categoryId: string;
      modelName: string;
      gtin: string | null;
      verificationPolicy: string;
    },
  ) {
    return this.prisma.supplyBatch.findMany({
      where: {
        id: {
          in: batchIds,
        },
        shopId,
        brandId: identity.brandId,
        categoryId: identity.categoryId,
        modelName: identity.modelName,
        gtin: identity.gtin,
        verificationPolicy: identity.verificationPolicy,
      },
      select: {
        id: true,
        batchNumber: true,
        quantity: true,
        distributionNodeId: true,
        offerLinks: {
          select: {
            offerId: true,
            allocatedQuantity: true,
          },
        },
      },
    });
  }

  async replaceOfferBatchLinks(input: {
    offerId: string;
    soldQuantity: number;
    items: Array<{
      batchId: string;
      allocatedQuantity: number;
    }>;
  }) {
    const totalAllocatedQuantity = input.items.reduce((sum, item) => sum + item.allocatedQuantity, 0);
    const newAvailableQuantity = Math.max(totalAllocatedQuantity - input.soldQuantity, 0);

    return this.prisma.$transaction(async (tx) => {
      await tx.offerBatchLink.deleteMany({
        where: {
          offerId: input.offerId,
        },
      });

      if (input.items.length > 0) {
        await tx.offerBatchLink.createMany({
          data: input.items.map((item) => ({
            offerId: input.offerId,
            batchId: item.batchId,
            allocatedQuantity: item.allocatedQuantity,
          })),
        });
      }

      await tx.offer.update({
        where: {
          id: input.offerId,
        },
        data: {
          availableQuantity: newAvailableQuantity,
        },
      });

      return tx.offerBatchLink.findMany({
        where: {
          offerId: input.offerId,
        },
        include: {
          batch: {
            select: {
              batchNumber: true,
              quantity: true,
              sourceName: true,
              countryOfOrigin: true,
              sourceType: true,
              sourceOrderId: true,
              sourceOrderItemId: true,
              receivedAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    });
  }

  findOfferBatchLinks(offerId: string) {
    return this.prisma.offerBatchLink.findMany({
      where: {
        offerId,
      },
      include: {
        batch: {
          select: {
            batchNumber: true,
            quantity: true,
            sourceName: true,
            countryOfOrigin: true,
            sourceType: true,
            sourceOrderId: true,
            sourceOrderItemId: true,
            receivedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  createOfferMedia(data: {
    offerId: string;
    mediaAssetId: string | null;
    mediaType: string;
    fileUrl: string;
    phash: string | null;
  }) {
    return this.prisma.offerMedia.create({
      data: {
        offerId: data.offerId,
        mediaAssetId: data.mediaAssetId,
        mediaType: data.mediaType,
        fileUrl: data.fileUrl,
        phash: data.phash,
      },
      include: {
        mediaAsset: true,
      },
    });
  }

  findOfferMedia(offerId: string) {
    return this.prisma.offerMedia.findMany({
      where: { offerId },
      include: {
        mediaAsset: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  findOwnedOfferMedia(offerId: string, mediaId: string, sellerUserId: string) {
    return this.prisma.offerMedia.findFirst({
      where: {
        id: mediaId,
        offerId,
        offer: {
          sellerUserId,
        },
      },
    });
  }

  deleteOfferMedia(mediaId: string) {
    return this.prisma.offerMedia.delete({
      where: {
        id: mediaId,
      },
    });
  }

  setOfferPrimaryMedia(offerId: string, mediaId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.offerMedia.updateMany({
        where: {
          offerId,
          mediaType: 'thumbnail',
          id: { not: mediaId },
        },
        data: {
          mediaType: 'gallery',
        },
      });

      return tx.offerMedia.update({
        where: {
          id: mediaId,
        },
        data: {
          mediaType: 'thumbnail',
        },
        include: {
          mediaAsset: true,
        },
      });
    });
  }

  findOfferReviews(offerId: string) {
    return this.prisma.review.findMany({
      where: {
        OR: [
          {
            orderItem: {
              offerId,
            },
          },
          {
            orderItemId: null,
            order: {
              items: {
                some: {
                  offerId,
                },
              },
            },
          },
        ],
      },
      include: {
        orderItem: {
          select: {
            offerId: true,
          },
        },
        fromUser: {
          select: {
            displayName: true,
            email: true,
            phone: true,
          },
        },
        media: {
          include: {
            mediaAsset: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findLatestCompletedOrderItemForOffer(offerId: string, buyerUserId: string) {
    return this.prisma.orderItem.findFirst({
      where: {
        offerId,
        order: {
          buyerUserId,
          OR: [{ orderStatus: 'completed' }, { fulfillmentStatus: 'DELIVERED' }],
        },
      },
      include: {
        order: {
          include: {
            shop: {
              select: {
                ownerUserId: true,
              },
            },
          },
        },
        reviews: {
          where: {
            fromUserId: buyerUserId,
          },
          include: {
            media: {
              include: {
                mediaAsset: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        order: {
          createdAt: 'desc',
        },
      },
    });
  }

  findCompletedOrderItemForReview(orderItemId: string, buyerUserId: string) {
    return this.prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: {
          buyerUserId,
          OR: [{ orderStatus: 'completed' }, { fulfillmentStatus: 'DELIVERED' }],
        },
      },
      include: {
        order: {
          include: {
            shop: {
              select: {
                ownerUserId: true,
              },
            },
          },
        },
        reviews: {
          where: {
            fromUserId: buyerUserId,
          },
          include: {
            media: {
              include: {
                mediaAsset: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });
  }

  createReview(data: {
    orderId: string;
    orderItemId: string;
    fromUserId: string;
    toUserId: string;
    rating: number;
    comment: string | null;
  }) {
    return this.prisma.review.create({
      data,
      include: {
        orderItem: {
          select: {
            offerId: true,
          },
        },
        fromUser: {
          select: {
            displayName: true,
            email: true,
            phone: true,
          },
        },
        media: {
          include: {
            mediaAsset: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  updateReview(reviewId: string, data: { rating: number; comment: string | null }) {
    return this.prisma.review.update({
      where: {
        id: reviewId,
      },
      data,
      include: {
        orderItem: {
          select: {
            offerId: true,
          },
        },
        fromUser: {
          select: {
            displayName: true,
            email: true,
            phone: true,
          },
        },
        media: {
          include: {
            mediaAsset: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  findReviewOwnedByBuyer(reviewId: string, buyerUserId: string) {
    return this.prisma.review.findFirst({
      where: {
        id: reviewId,
        fromUserId: buyerUserId,
      },
      include: {
        media: {
          include: {
            mediaAsset: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  createReviewMedia(data: {
    reviewId: string;
    mediaAssetId: string | null;
    fileUrl: string;
    mimeType: string | null;
    publicId: string | null;
  }) {
    return this.prisma.reviewMedia.create({
      data,
      include: {
        mediaAsset: true,
      },
    });
  }

  createOfferDocument(data: {
    offerId: string;
    mediaAssetId: string | null;
    docType: string;
    fileUrl: string;
    issuerName: string | null;
    documentNumber: string | null;
  }) {
    return this.prisma.offerDocument.create({
      data: {
        offerId: data.offerId,
        mediaAssetId: data.mediaAssetId,
        docType: data.docType,
        fileUrl: data.fileUrl,
        issuerName: data.issuerName,
        documentNumberHash: data.documentNumber ? this.hashValue(data.documentNumber) : null,
        reviewStatus: 'pending',
      },
      include: {
        mediaAsset: true,
      },
    });
  }

  findOfferDocuments(offerId: string) {
    return this.prisma.offerDocument.findMany({
      where: { offerId },
      include: {
        mediaAsset: true,
      },
      orderBy: {
        uploadedAt: 'asc',
      },
    });
  }

  findOwnedOfferDocument(offerId: string, documentId: string, sellerUserId: string) {
    return this.prisma.offerDocument.findFirst({
      where: {
        id: documentId,
        offerId,
        offer: {
          sellerUserId,
        },
      },
    });
  }

  deleteOfferDocument(documentId: string) {
    return this.prisma.offerDocument.delete({
      where: {
        id: documentId,
      },
    });
  }

  private hashValue(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
