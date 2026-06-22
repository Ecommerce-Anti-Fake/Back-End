import { NotFoundException } from '@nestjs/common';
import { ListOfferReviewsUseCase } from './list-offer-reviews.use-case';

describe('ListOfferReviewsUseCase', () => {
  const reviewsRepository = {
    offerExists: jest.fn(),
    findOfferReviews: jest.fn(),
  };
  const useCase = new ListOfferReviewsUseCase(reviewsRepository as never);

  beforeEach(() => jest.clearAllMocks());

  it('throws 404 when offer does not exist', async () => {
    reviewsRepository.offerExists.mockResolvedValue(false);

    await expect(useCase.execute('offer-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(reviewsRepository.findOfferReviews).not.toHaveBeenCalled();
  });

  it('returns an empty summary when offer has no reviews', async () => {
    reviewsRepository.offerExists.mockResolvedValue(true);
    reviewsRepository.findOfferReviews.mockResolvedValue([]);

    await expect(useCase.execute('offer-id')).resolves.toEqual({
      total: 0,
      averageRating: 0,
      items: [],
    });
  });

  it('returns only the public review-list fields', async () => {
    reviewsRepository.offerExists.mockResolvedValue(true);
    reviewsRepository.findOfferReviews.mockResolvedValue([
      {
        id: 'review-1',
        rating: 5,
        comment: 'San pham dung mo ta.',
        createdAt: new Date('2026-05-14T10:00:00.000Z'),
        fromUser: { displayName: null },
        media: [
          {
            fileUrl: 'legacy-url',
            mediaAsset: { secureUrl: 'https://cdn.example/review.jpg' },
          },
        ],
      },
    ]);

    await expect(useCase.execute('offer-id')).resolves.toEqual({
      total: 1,
      averageRating: 5,
      items: [
        {
          id: 'review-1',
          rating: 5,
          comment: 'San pham dung mo ta.',
          authorName: 'Nguoi mua da xac minh',
          media: [{ fileUrl: 'https://cdn.example/review.jpg' }],
          createdAt: '2026-05-14T10:00:00.000Z',
        },
      ],
    });
  });

  it('rounds averageRating to one decimal', async () => {
    reviewsRepository.offerExists.mockResolvedValue(true);
    reviewsRepository.findOfferReviews.mockResolvedValue(
      [5, 5, 4].map((rating, index) => ({
        id: `review-${index}`,
        rating,
        comment: null,
        createdAt: new Date(`2026-05-1${index + 1}T10:00:00.000Z`),
        fromUser: { displayName: 'Buyer' },
        media: [],
      })),
    );

    const result = await useCase.execute('offer-id');

    expect(result.averageRating).toBe(4.7);
  });
});
