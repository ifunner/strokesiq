import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
// Shared GolfIQ design system (vendored from golfiq-design; do not edit
// src/styles/golfiq.css by hand — edit the source package and run its sync).
import './styles/golfiq.css';
import './styles/components.css';
import { initApp } from './app';
import { initPWA } from './pwa';

const root = document.getElementById('app');
if (root) {
  initPWA();
  initApp(root).catch((err) => {
    root.innerHTML = `<div style="padding:18px;font-family:system-ui,sans-serif;color:#E06A5C;background:#0A201A;min-height:100vh"><strong>StrokesIQ failed to start.</strong><p>${String(err)}</p><p style="color:#9DB3A6;font-size:14px">Try a hard refresh. If you recently changed the repo name, clear this site's data in browser settings.</p></div>`;
    console.error(err);
  });
}
