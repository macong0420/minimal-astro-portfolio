import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://blog.yc0501.online',
  output: "static",
  prefetch: true,
  compressHTML: true,
});