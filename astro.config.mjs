import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { approvalGate } from './src/integrations/approval-gate.mjs';

// Old demo pages published by the Jekyll site. GitHub Pages cannot redirect
// server-side, so each gets a generated redirect page to the home route.
const legacyPages = [
  'fullscreen', 'labnol', 'liveperson', 'msbot', 'msbotiframe',
  'simple.speech.search', 'texttospeech', 'web-speech',
];

export default defineConfig({
  site: 'https://deb007.github.io',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  redirects: Object.fromEntries(legacyPages.map((p) => [`/${p}.html`, '/'])),
  integrations: [sitemap(), approvalGate()],
  vite: { plugins: [tailwindcss()] },
});
