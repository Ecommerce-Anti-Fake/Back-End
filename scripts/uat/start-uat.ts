import {
  assertUatRuntimeDatabaseTarget,
  assertUatRuntimePublicUrl,
  requiredUatSecret,
} from './uat-safety';
import { loadUatEnv } from './load-uat-env';

loadUatEnv();
assertUatRuntimeDatabaseTarget();
assertUatRuntimePublicUrl(requiredUatSecret('UAT_FRONTEND_PUBLIC_URL'));

import('../../dist/apps/api-gateway/apps/api-gateway/src/main.js').catch(
  (error) => {
    console.error(
      error instanceof Error ? error.message : 'UAT API startup failed',
    );
    process.exitCode = 1;
  },
);
