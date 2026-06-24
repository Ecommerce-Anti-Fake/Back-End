import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const schemaDir = join(process.cwd(), 'prisma', 'schema');
const outputFile = join(process.cwd(), 'prisma', 'schema.prisma');

if (!existsSync(schemaDir)) {
  throw new Error(`Schema folder not found: ${schemaDir}`);
}

const files = readdirSync(schemaDir)
  .filter((file) => file.endsWith('.prisma'))
  .sort((a, b) => a.localeCompare(b));

if (files.length === 0) {
  throw new Error(`No .prisma files found in: ${schemaDir}`);
}

const merged = files
  .map((file) => readFileSync(join(schemaDir, file), 'utf8').trim())
  .filter(Boolean)
  .join('\n\n') + '\n';

writeFileSync(outputFile, merged);
console.log(`Merged ${files.length} schema files into prisma/schema.prisma`);
