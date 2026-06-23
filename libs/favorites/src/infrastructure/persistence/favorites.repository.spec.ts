import { FavoritesRepository } from './favorites.repository';

describe('FavoritesRepository', () => {
  it('persists favorite offers idempotently per user and offer', async () => {
    const prisma = {
      offer: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'offer-1' }),
      },
      userFavoriteOffer: {
        upsert: jest.fn().mockResolvedValue({ id: 'favorite-1' }),
      },
    };
    const repository = new FavoritesRepository(prisma as never);

    await expect(
      repository.addFavoriteOffer('user-1', 'offer-1'),
    ).resolves.toEqual({ offerId: 'offer-1', isFavorite: true });
    expect(prisma.offer.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'offer-1' },
      select: { id: true },
    });
    expect(prisma.userFavoriteOffer.upsert).toHaveBeenCalledWith({
      where: { userId_offerId: { userId: 'user-1', offerId: 'offer-1' } },
      update: {},
      create: { userId: 'user-1', offerId: 'offer-1' },
    });
  });

  it('lists and removes favorite offers for a user', async () => {
    const prisma = {
      userFavoriteOffer: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ offerId: 'offer-2' }, { offerId: 'offer-1' }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new FavoritesRepository(prisma as never);

    await expect(repository.listFavoriteOfferIds('user-1')).resolves.toEqual([
      'offer-2',
      'offer-1',
    ]);
    expect(prisma.userFavoriteOffer.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      select: { offerId: true },
    });

    await expect(
      repository.removeFavoriteOffer('user-1', 'offer-1'),
    ).resolves.toEqual({ offerId: 'offer-1', isFavorite: false });
    expect(prisma.userFavoriteOffer.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', offerId: 'offer-1' },
    });
  });
});
