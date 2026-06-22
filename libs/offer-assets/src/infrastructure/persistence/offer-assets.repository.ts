import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class OfferAssetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOwnedOffer(offerId: string, sellerUserId: string) {
    return this.prisma.offer.findFirst({
      where: { id: offerId, sellerUserId },
      select: { id: true, shop: { select: { shopStatus: true } } },
    });
  }

  findOfferById(offerId: string) {
    return this.prisma.offer.findUnique({
      where: { id: offerId },
      select: { id: true },
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
      data,
      include: { mediaAsset: true },
    });
  }

  findOfferMedia(offerId: string) {
    return this.prisma.offerMedia.findMany({
      where: { offerId },
      include: { mediaAsset: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  findOwnedOfferMedia(offerId: string, mediaId: string, sellerUserId: string) {
    return this.prisma.offerMedia.findFirst({
      where: { id: mediaId, offerId, offer: { sellerUserId } },
    });
  }

  deleteOfferMedia(mediaId: string) {
    return this.prisma.offerMedia.delete({ where: { id: mediaId } });
  }

  setOfferPrimaryMedia(offerId: string, mediaId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.offerMedia.updateMany({
        where: { offerId, mediaType: 'thumbnail', id: { not: mediaId } },
        data: { mediaType: 'gallery' },
      });
      return tx.offerMedia.update({
        where: { id: mediaId },
        data: { mediaType: 'thumbnail' },
        include: { mediaAsset: true },
      });
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
        documentNumberHash: data.documentNumber
          ? this.hashValue(data.documentNumber)
          : null,
        reviewStatus: 'pending',
      },
      include: { mediaAsset: true },
    });
  }

  findOfferDocuments(offerId: string) {
    return this.prisma.offerDocument.findMany({
      where: { offerId },
      include: { mediaAsset: true },
      orderBy: { uploadedAt: 'asc' },
    });
  }

  findOwnedOfferDocument(
    offerId: string,
    documentId: string,
    sellerUserId: string,
  ) {
    return this.prisma.offerDocument.findFirst({
      where: { id: documentId, offerId, offer: { sellerUserId } },
    });
  }

  deleteOfferDocument(documentId: string) {
    return this.prisma.offerDocument.delete({ where: { id: documentId } });
  }

  private hashValue(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
