import { AddressCatalogService } from './address-catalog.service';
import { OrdersRpcService } from '../order/orders-rpc.service';

describe('AddressCatalogService', () => {
  const ordersRpcService = {
    listGhnProvinces: jest.fn(),
    listGhnDistricts: jest.fn(),
    listGhnWards: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns provider-neutral province options', async () => {
    ordersRpcService.listGhnProvinces.mockResolvedValue([{ provinceId: 202, provinceName: 'Ho Chi Minh' }]);
    const service = new AddressCatalogService(ordersRpcService as unknown as OrdersRpcService);

    await expect(service.listProvinces()).resolves.toEqual([
      {
        provinceCode: 'VN-P202',
        provinceName: 'Ho Chi Minh',
      },
    ]);
  });

  it('returns provider-neutral ward options sorted by ward name', async () => {
    ordersRpcService.listGhnDistricts.mockResolvedValue([{ districtId: 1450 }]);
    ordersRpcService.listGhnWards.mockResolvedValue([
      { wardCode: '21212', wardName: 'Ward B' },
      { wardCode: '21211', wardName: 'Ward A' },
    ]);
    const service = new AddressCatalogService(ordersRpcService as unknown as OrdersRpcService);

    await expect(service.listWards('VN-P202')).resolves.toEqual([
      {
        provinceCode: 'VN-P202',
        wardCode: 'VN-P202-D1450-W21211',
        wardName: 'Ward A',
      },
      {
        provinceCode: 'VN-P202',
        wardCode: 'VN-P202-D1450-W21212',
        wardName: 'Ward B',
      },
    ]);
    expect(ordersRpcService.listGhnDistricts).toHaveBeenCalledWith({ provinceId: 202 });
  });

  it('returns no wards for invalid province codes', async () => {
    const service = new AddressCatalogService(ordersRpcService as unknown as OrdersRpcService);

    await expect(service.listWards('invalid')).resolves.toEqual([]);
    expect(ordersRpcService.listGhnDistricts).not.toHaveBeenCalled();
  });
});
