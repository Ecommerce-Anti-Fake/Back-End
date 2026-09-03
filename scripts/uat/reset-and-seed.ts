import { spawnSync } from 'node:child_process';
import {
  assertUatDatabaseTarget,
  assertUatPublicUrl,
  requiredUatSecret,
} from './uat-safety';
import { loadUatEnv } from './load-uat-env';
import {
  assertSeedEncryptionKey,
  uatQrCode,
} from '../../prisma/seeds/00-utils';

loadUatEnv();

const databaseTarget = assertUatDatabaseTarget();
assertUatPublicUrl(requiredUatSecret('UAT_FRONTEND_PUBLIC_URL'));
requiredUatSecret('UAT_TEST_PASSWORD');
uatQrCode();
requiredUatSecret('PAYOUT_ACCOUNT_ENCRYPTION_KEY');
assertSeedEncryptionKey();

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(command: string, args: string[]) {
  console.log(`UAT step: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `UAT step failed with exit code ${result.status ?? 'unknown'}`,
    );
  }
}

try {
  console.log(
    `UAT reset target: ${databaseTarget.target}/${databaseTarget.databaseName}`,
  );
  run(npmCommand, ['run', 'prisma:merge']);
  run(npxCommand, ['prisma', 'migrate', 'deploy']);
  run(npmCommand, ['run', 'db:seed']);
  run(npmCommand, ['run', 'uat:verify']);
  console.log('UAT reset and fixture verification completed.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'UAT reset failed');
  process.exitCode = 1;
}
