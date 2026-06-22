import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ActiveUserGuard, JwtAuthGuard } from '@security';
import request from 'supertest';
import { CatalogRpcService } from '../offer/catalog-rpc.service';
import { ReviewController } from './review.controller';

describe('ReviewController', () => {
  let app: INestApplication;
  const catalogRpcService = { findOfferReviews: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReviewController],
      providers: [{ provide: CatalogRpcService, useValue: catalogRpcService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ActiveUserGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(() => app?.close());
  beforeEach(() => jest.clearAllMocks());

  it('exposes GET /offers/:offerId/reviews and validates offerId as UUID', async () => {
    catalogRpcService.findOfferReviews.mockResolvedValue({
      total: 0,
      averageRating: 0,
      items: [],
    });

    await request(app.getHttpServer())
      .get('/offers/not-a-uuid/reviews')
      .expect(400);

    await request(app.getHttpServer())
      .get('/offers/123e4567-e89b-42d3-a456-426614174000/reviews')
      .expect(200)
      .expect({ total: 0, averageRating: 0, items: [] });
  });
});
