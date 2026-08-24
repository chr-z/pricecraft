// PriceCraft bootstrap: register the PWA service worker (prod only) and populate
// the language selector. Language switching itself is wired in app.ts.
import { boot } from './app';
import { SUPPORTED, initLanguage } from './i18n';

void boot();

const langSel = document.getElementById('lang-select') as HTMLSelectElement | null;
if (langSel) {
  for (const code of SUPPORTED) {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = code === 'pt-BR' ? 'Português (BR)' : 'English';
    langSel.appendChild(opt);
  }
  void initLanguage().then((lang) => {
    langSel.value = lang;
  });
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
