import { VerificationController } from './verification.controller';

describe('VerificationController', () => {
  it('forwards the validated public query to the catalog service', async () => {
    const catalogRpcService = {
      verifyProduct: jest.fn().mockResolvedValue({ status: 'NOT_FOUND' }),
    };
    const controller = new VerificationController(catalogRpcService as never);

    await expect(
      controller.verifyProduct({ code: 'ABC-123' }),
    ).resolves.toEqual({
      status: 'NOT_FOUND',
    });
    expect(catalogRpcService.verifyProduct).toHaveBeenCalledWith({
      code: 'ABC-123',
    });
  });
});
