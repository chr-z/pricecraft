// Currency formatting with configurable code + locale (kept in JS: Intl is a
// browser/node builtin, not pricing math). Mirrors v1 js/core.js#formatCurrency.

export interface CurrencyOptions {
  code?: string;
  locale?: string;
}

export function formatCurrency(value: number, opts: CurrencyOptions = {}): string {
  const num = Number(value);
  const code = String(opts.code ?? 'USD');
  const locale = String(opts.locale ?? 'en-US');
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(
      Number.isFinite(num) ? num : 0
    );
  } catch {
    const amount = (Number.isFinite(num) ? num : 0).toFixed(2);
    return `${code} ${amount}`;
  }
}
