const { spawn } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

const services = [
  'auth-service',
  'users-service',
  'catalog-service',
  'orders-service',
  'affiliate-service',
  'api-gateway',
];

const children = services.map((name) => {
  const entry = resolveEntry(name);
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

function resolveEntry(name) {
  const candidates = [
    join('dist', 'apps', name, 'main.js'),
    join('dist', 'apps', name, 'src', 'main.js'),
    join('dist', 'apps', name, 'apps', name, 'src', 'main.js'),
  ];

  const entry = candidates.find((candidate) => existsSync(candidate));
  if (!entry) {
    throw new Error(`Could not find build entry for ${name}. Checked: ${candidates.join(', ')}`);
  }

  return entry;
}
