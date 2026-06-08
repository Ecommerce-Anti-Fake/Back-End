import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_METADATA_KEY = 'api-gateway:rate-limit';

export type RateLimitProfile = 'auth' | 'uploadSignature' | 'paymentWebhook' | 'publicCatalog';

export interface RateLimitOptions {
  profile: RateLimitProfile;
  limit?: number;
  windowMs?: number;
}

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_METADATA_KEY, options);
