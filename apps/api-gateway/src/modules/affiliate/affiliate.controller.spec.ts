import { AffiliateController } from './affiliate.controller';

describe('AffiliateController seller dashboard contracts', () => {
  const rpcService = {
    findSellerPrograms: jest.fn(),
    getSellerSummary: jest.fn(),
    updateProgram: jest.fn(),
    findProgramCommissions: jest.fn(),
  };
  const controller = new AffiliateController(
    rpcService as never,
    { sign: jest.fn() } as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('derives seller identity when listing dashboard programs', async () => {
    rpcService.findSellerPrograms.mockResolvedValueOnce({ items: [] });

    await controller.findSellerPrograms('seller-1', {
      page: 2,
      pageSize: 10,
      status: 'ACTIVE',
      search: 'summer',
    } as never);

    expect(rpcService.findSellerPrograms).toHaveBeenCalledWith({
      requesterUserId: 'seller-1',
      page: 2,
      pageSize: 10,
      status: 'ACTIVE',
      search: 'summer',
    });
  });

  it('never accepts seller identity from the update body', async () => {
    rpcService.updateProgram.mockResolvedValueOnce({ id: 'program-1' });

    await controller.updateProgram(
      'seller-1',
      'program-1',
      { name: 'Updated program', programStatus: 'PAUSED' } as never,
    );

    expect(rpcService.updateProgram).toHaveBeenCalledWith({
      requesterUserId: 'seller-1',
      programId: 'program-1',
      name: 'Updated program',
      programStatus: 'PAUSED',
    });
  });
});
