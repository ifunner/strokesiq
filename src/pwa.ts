import { registerSW } from 'virtual:pwa-register';

/**
 * Register the service worker and surface an unobtrusive "new version" banner
 * when an update is waiting. registerType is 'prompt', so updates apply only
 * when the user taps Reload — avoiding stale-cache surprises after a deploy.
 */
export function initPWA(): void {
  const updateSW = registerSW({
    onNeedRefresh() {
      showUpdateBanner(() => updateSW(true));
    },
  });
}

function showUpdateBanner(reload: () => void): void {
  if (document.querySelector('.updatebar')) return;
  const bar = document.createElement('div');
  bar.className = 'updatebar';
  bar.innerHTML = `<span>New version available</span><button class="primary" id="sw-reload">Reload</button>`;
  document.body.appendChild(bar);
  bar.querySelector('#sw-reload')?.addEventListener('click', () => {
    bar.remove();
    reload();
  });
}
