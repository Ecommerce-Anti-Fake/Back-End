import { ListOffersUseCase } from './list-offers.use-case';

describe('ListOffersUseCase', () => {
  it('passes includeInactive and explicit status filters to the repository', async () => {
    const repository = {
      findAllOffers: jest.fn().mockResolvedValue({
        total: 0,
        page: 1,
        pageSize: 20,
        items: [],
      }),
    };
    const useCase = new ListOffersUseCase(repository as never);

    await useCase.execute({
      shopId: 'shop-1',
      includeInactive: true,
      offerStatus: 'inactive',
      moderationStatus: 'pending',
      page: 1,
      pageSize: 20,
    });

    expect(repository.findAllOffers).toHaveBeenCalledWith({
      shopId: 'shop-1',
      includeInactive: true,
      offerStatus: 'inactive',
      moderationStatus: 'pending',
      page: 1,
      pageSize: 20,
    });
  });
});
