import { defineConfig } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// Use Playwright's default browser if installed; otherwise fall back to the headless shell found in the cache.
function shell(): string | undefined {
  const root = join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(root)) return undefined;
  const dirs = readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse();
  for (const d of dirs) {
    const p = join(root, d, 'chrome-headless-shell-linux-arm64', 'chrome-headless-shell');
    if (existsSync(p)) return p;
  }
  return undefined;
}

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4329',
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
    launchOptions: { executablePath: process.env.PW_CHROMIUM || shell() },
  },
  webServer: {
    command: 'npx astro preview --host 127.0.0.1 --port 4329',
    url: 'http://127.0.0.1:4329/',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
