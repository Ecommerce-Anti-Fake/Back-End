import {
  assertUatDatabaseTarget,
  assertUatPublicUrl,
  requiredUatSecret,
} from './uat-safety';
import { loadUatEnv } from './load-uat-env';

loadUatEnv();
assertUatDatabaseTarget();
assertUatPublicUrl(requiredUatSecret('UAT_FRONTEND_PUBLIC_URL'));

import('../../dist/apps/api-gateway/apps/api-gateway/src/main.js').catch(
  (error) => {
    console.error(
      error instanceof Error ? error.message : 'UAT API startup failed',
    );
    process.exitCode = 1;
  },
);
