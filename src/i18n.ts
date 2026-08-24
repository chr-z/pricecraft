// PriceCraft i18n (v2): loads /locales/<lang>.json, merges EN fallback, persists choice.
// Same localStorage key (`pc_lang`) as v1 so returning users keep their language.
export const SUPPORTED: readonly string[] = ['en', 'pt-BR'];
const LS_KEY = 'pc_lang';

type Dict = Record<string, unknown>;
let dict: Dict = {};
let lang = 'en';

export function supportedLanguages(): string[] {
  return [...SUPPORTED];
}

export function currentLanguage(): string {
  return lang;
}

function deepGet(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (cur && typeof cur === 'object' && part in (cur as Dict)) {
      cur = (cur as Dict)[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

async function fetchJson(url: string): Promise<Dict> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`i18n fetch failed: ${url}`);
  return (await res.json()) as Dict;
}

export async function initLanguage(preferred?: string): Promise<string> {
  const saved = localStorage.getItem(LS_KEY);
  const nav = (navigator.language || 'en').toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
  let next = preferred ?? saved ?? nav;
  if (!SUPPORTED.includes(next)) next = nav;
  await load(next);
  apply();
  document.documentElement.lang = lang;
  return lang;
}

export async function load(next: string): Promise<void> {
  if (!SUPPORTED.includes(next)) next = 'en';
  dict = await fetchJson(`./locales/${next}.json`);
  // merge English for missing keys
  if (next !== 'en') {
    try {
      const en = await fetchJson('./locales/en.json');
      dict = { ...en, ...dict };
    } catch { /* keep partial */ }
  }
  lang = next;
  try { localStorage.setItem(LS_KEY, next); } catch { /* ignore */ }
}

export function setLanguage(next: string): Promise<string> {
  return load(next).then(() => {
    apply();
    document.documentElement.lang = lang;
    return lang;
  });
}

/** Translate a dotted key; returns the raw key when missing. */
export function t(path: string): string {
  const v = deepGet(dict, path);
  return typeof v === 'string' ? v : path;
}

/** Apply translations to all [data-i18n] / [data-i18n-ph] elements. */
export function apply(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((elm) => {
    elm.textContent = t(elm.getAttribute('data-i18n') ?? '');
  });
  document.querySelectorAll<Element>('[data-i18n-ph]').forEach((elm) => {
    const ph = elm.getAttribute('data-i18n-ph');
    if (ph !== null) elm.setAttribute('placeholder', t(ph));
  });
}
