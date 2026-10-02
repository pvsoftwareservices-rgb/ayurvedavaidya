// End-to-end tests against the production build (run `npm run build` first).
// - Static server (scripts/serve.mjs, port 4173): every page, with /api/contact.php intercepted in the tests.
// - PHP built-in server (port 8090, only when PHP 8 is available): the real handler with a fake mail
//   transport, for the no-JavaScript form submission. No real email is ever sent.
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const php = [process.env.PHP_BIN, 'php'].filter(Boolean).find((bin) => spawnSync(bin, ['-r', 'exit(PHP_VERSION_ID >= 80000 ? 0 : 1);']).status === 0)
export const MAIL_OUTBOX = join(tmpdir(), 'ayurvedavaidya-e2e-outbox.jsonl')
process.env.MAIL_OUTBOX = MAIL_OUTBOX
process.env.E2E_PHP = php ? '1' : ''

const webServer = [{ command: 'node scripts/serve.mjs', url: 'http://localhost:4173/', reuseExistingServer: true, env: { PORT: '4173' } }]
if (php) {
  webServer.push({
    command: `"${php}" -S 127.0.0.1:8090 -t dist tests/php/router.php`,
    url: 'http://127.0.0.1:8090/',
    reuseExistingServer: false,
    env: {
      MAIL_OUTBOX, SMTP_HOST: 'smtp.invalid', SMTP_PORT: '465', SMTP_USER: 'test@example.com', SMTP_PASS: 'unused-in-tests',
      MAIL_TO: 'inbox@example.com', MAIL_FROM: 'test@example.com', RATE_LIMIT_MAX: '100',
    },
  })
}

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60000,
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', ...devices['Desktop Chrome'] },
  webServer,
})
