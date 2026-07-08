import { Test } from '@nestjs/testing';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';
import { ListAdminOffersUseCase } from './list-admin-offers.use-case';

describe('ListAdminOffersUseCase', () => {
  const repository = { findAdminOffers: jest.fn() };

  beforeEach(() => jest.resetAllMocks());

  it('returns the compact paginated admin offer contract', async () => {
    repository.findAdminOffers.mockResolvedValueOnce({
      total: 1,
      items: [
        {
          id: 'offer-1',
          title: 'Kem chong nang',
          price: { toNumber: () => 150000 },
          currency: 'VND',
          offerStatus: 'inactive',
          moderationStatus: 'pending',
          createdAt: new Date('2026-07-03T08:30:00Z'),
          shop: { id: 'shop-1', shopName: 'Shop Chinh Hang' },
          category: { id: 'category-1', name: 'My pham' },
          media: [
            { mediaType: 'gallery', fileUrl: 'gallery.jpg', mediaAsset: null },
            {
              mediaType: 'thumbnail',
              fileUrl: 'fallback.jpg',
              mediaAsset: { secureUrl: 'https://cdn.test/thumbnail.jpg' },
            },
          ],
        },
      ],
    });
    const module = await Test.createTestingModule({
      providers: [
        ListAdminOffersUseCase,
        { provide: OffersRepository, useValue: repository },
      ],
    }).compile();

    const result = await module.get(ListAdminOffersUseCase).execute({
      offerStatus: 'inactive',
      moderationStatus: 'pending',
      page: 1,
      pageSize: 10,
    });

    expect(repository.findAdminOffers).toHaveBeenCalledWith({
      offerStatus: 'inactive',
      moderationStatus: 'pending',
      page: 1,
      pageSize: 10,
    });
    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
      items: [
        {
          id: 'offer-1',
          title: 'Kem chong nang',
          thumbnail: 'https://cdn.test/thumbnail.jpg',
          price: 150000,
          currency: 'VND',
          shop: { id: 'shop-1', name: 'Shop Chinh Hang' },
          category: { id: 'category-1', name: 'My pham' },
          offerStatus: 'inactive',
          moderationStatus: 'pending',
          createdAt: new Date('2026-07-03T08:30:00Z'),
        },
      ],
    });
  });
});
