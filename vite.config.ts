import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function normalizeBase(path: string): string {
  if (!path || path === '/') return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

/** Dev: `/` · CI: `/<repo-name>/` or `/` for user sites · fallback: `/strokesiq/` */
function resolveBase(command: string): string {
  if (command === 'serve') return '/';

  if (process.env.VITE_BASE_PATH) {
    return normalizeBase(process.env.VITE_BASE_PATH);
  }

  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (repo) {
    if (repo.endsWith('.github.io')) return '/';
    return normalizeBase(`/${repo}`);
  }

  return '/strokesiq/';
}

export default defineConfig(({ command }) => {
  const base = resolveBase(command);

  return {
    base,
    server: {
      port: 5173,
      open: true,
    },
    plugins: [
      VitePWA({
        registerType: 'prompt',
        devOptions: { enabled: false },
        includeAssets: ['icons/*.png', 'icons/*.svg'],
        manifest: {
          name: 'StrokesIQ',
          short_name: 'StrokesIQ',
          description: 'Where did your strokes go, and what do you practice next?',
          theme_color: '#0E2A22',
          background_color: '#0A201A',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,woff2,json,svg}'],
          navigateFallback: `${base}index.html`,
        },
      }),
    ],
    test: {
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  };
});
