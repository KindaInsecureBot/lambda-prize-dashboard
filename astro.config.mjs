import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// GitHub Pages project site: served from https://<user>.github.io/<repo>/
// `site` + `base` are filled by the deploy workflow via env, with sane local defaults.
const site = process.env.SITE_URL || 'https://kindainsecurebot.github.io';
const base = process.env.BASE_PATH || '/lambda-prize-dashboard';

export default defineConfig({
  site,
  base,
  integrations: [react()],
  build: { format: 'directory' },
});
