const { existsSync } = require('fs');
const { join } = require('path');

const candidates = [
  join('dist', 'apps', 'api-gateway', 'deploy-main.js'),
  join('dist', 'apps', 'api-gateway', 'src', 'deploy-main.js'),
  join('dist', 'apps', 'api-gateway', 'apps', 'api-gateway', 'src', 'deploy-main.js'),
];

const entry = candidates.find((candidate) => existsSync(candidate));

if (!entry) {
  throw new Error(`Could not find deploy entry. Checked: ${candidates.join(', ')}`);
}

require(join('..', entry));
