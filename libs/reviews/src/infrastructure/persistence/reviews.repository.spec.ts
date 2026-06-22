import { ReviewsRepository } from './reviews.repository';

describe('ReviewsRepository.findOfferReviews', () => {
  it('checks offer existence by id only', async () => {
    const prisma = {
      offer: {
        findUnique: jest.fn().mockResolvedValue({ id: 'offer-id' }),
      },
    };
    const repository = new ReviewsRepository(prisma as never);

    await expect(repository.offerExists('offer-id')).resolves.toBe(true);
    expect(prisma.offer.findUnique).toHaveBeenCalledWith({
      where: { id: 'offer-id' },
      select: { id: true },
    });
  });

  it('queries only reviews linked to the offer and selects public-list data', async () => {
    const prisma = {
      review: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const repository = new ReviewsRepository(prisma as never);

    await repository.findOfferReviews('offer-id');

    expect(prisma.review.findMany).toHaveBeenCalledWith({
      where: { orderItem: { offerId: 'offer-id' } },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        fromUser: { select: { displayName: true } },
        media: {
          select: {
            fileUrl: true,
            mediaAsset: { select: { secureUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });
});
