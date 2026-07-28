const { existsSync } = require('node:fs');
const { join, relative } = require('node:path');

const candidates = [
  join(__dirname, 'dist', 'apps', 'api-gateway', 'passenger-main.js'),
  join(__dirname, 'dist', 'apps', 'api-gateway', 'src', 'passenger-main.js'),
  join(
    __dirname,
    'dist',
    'apps',
    'api-gateway',
    'apps',
    'api-gateway',
    'src',
    'passenger-main.js',
  ),
];

const entry = candidates.find((candidate) => existsSync(candidate));

if (!entry) {
  const error = new Error(
    `Could not find Passenger entry. Run npm run build:passenger first. Checked: ${candidates
      .map((candidate) => relative(__dirname, candidate))
      .join(', ')}`,
  );
  console.error('[passenger] startup loader failed', error);
  throw error;
}

console.log(`[passenger] loading ${relative(__dirname, entry)}`);
require(entry);
