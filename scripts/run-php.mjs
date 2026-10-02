// Runs a PHP script with the first PHP 8+ binary found: $PHP_BIN, then `php` on PATH.
//   node scripts/run-php.mjs tests/php/run.php
import { spawnSync } from 'node:child_process'

const candidates = [process.env.PHP_BIN, 'php'].filter(Boolean)
const bin = candidates.find((c) => spawnSync(c, ['-r', 'exit(PHP_VERSION_ID >= 80000 ? 0 : 1);']).status === 0)
if (!bin) {
  console.error('PHP 8+ was not found. Install PHP or set PHP_BIN=/path/to/php, then run this again.')
  process.exit(1)
}
const result = spawnSync(bin, process.argv.slice(2), { stdio: 'inherit' })
process.exit(result.status ?? 1)
