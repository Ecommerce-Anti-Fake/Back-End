import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadUatEnv(fileName = process.env.UAT_ENV_FILE?.trim()) {
  if (!fileName) return undefined;

  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) {
    throw new Error(`UAT_ENV_FILE does not exist: ${fileName}`);
  }

  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, name, rawValue] = match;
    const value = rawValue.trim();
    const unquoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
        ? value.slice(1, -1)
        : value;
    if (process.env[name] === undefined) process.env[name] = unquoted;
  }

  return filePath;
}
