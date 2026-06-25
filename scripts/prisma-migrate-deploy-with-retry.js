const { spawnSync } = require('child_process');

const maxAttempts = Number.parseInt(process.env.PRISMA_MIGRATE_DEPLOY_ATTEMPTS ?? '5', 10);
const delayMs = Number.parseInt(process.env.PRISMA_MIGRATE_DEPLOY_RETRY_DELAY_MS ?? '15000', 10);
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isRetryableMigrationFailure(output) {
  return output.includes('P1002') || output.includes('Timed out trying to acquire a postgres advisory lock');
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.error(`Running prisma migrate deploy (attempt ${attempt}/${maxAttempts})`);
  const result = spawnSync(npx, ['prisma', 'migrate', 'deploy'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status === 0) {
    process.exit(0);
  }

  if (attempt === maxAttempts || !isRetryableMigrationFailure(output)) {
    process.exit(result.status ?? 1);
  }

  console.error(`Prisma migration lock was busy; retrying in ${delayMs}ms`);
  sleep(delayMs);
}
