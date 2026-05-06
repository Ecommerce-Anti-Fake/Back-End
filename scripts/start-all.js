const { spawn } = require('child_process');

const services = [
  ['auth-service', 'dist/apps/auth-service/main.js'],
  ['users-service', 'dist/apps/users-service/main.js'],
  ['catalog-service', 'dist/apps/catalog-service/main.js'],
  ['orders-service', 'dist/apps/orders-service/main.js'],
  ['affiliate-service', 'dist/apps/affiliate-service/main.js'],
  ['api-gateway', 'dist/apps/api-gateway/main.js'],
];

const children = services.map(([name, entry]) => {
  const child = spawn(process.execPath, [entry], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  child.stdout.on('data', (data) => process.stdout.write(`[${name}] ${data}`));
  child.stderr.on('data', (data) => process.stderr.write(`[${name}] ${data}`));

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    console.error(`[${name}] exited with ${signal || code}`);
    shutdown(code || 1);
  });

  return child;
});

let shuttingDown = false;

function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(code), 500);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
