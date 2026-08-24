// PriceCraft v2 UI — TypeScript. ALL pricing math lives in the Rust/WASM engine
// (src/pkg); this module only glues the DOM to it.
import init, {
  computeCostPlus,
  computeValueBased,
  psychological,
  breakEvenUnits,
} from './pkg/pricecraft_engine.js';
import { formatCurrency } from './currency.js';
import * as i18n from './i18n.js';

type Currency = { code: string; locale: string };
const CURRENCY_KEY = 'pc_currency';

let currency: Currency = { code: 'USD', locale: 'en-US' };

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el;
};

function fmt(n: number): string {
  return formatCurrency(n, currency);
}

// ---------- currency ----------
function initCurrency(): void {
  const sel = $('currency-select') as HTMLSelectElement;
  try {
    const saved = JSON.parse(localStorage.getItem(CURRENCY_KEY) ?? 'null') as Currency | null;
    if (saved && typeof saved.code === 'string' && typeof saved.locale === 'string') {
      currency = saved;
    }
  } catch { /* default */ }
  const wanted = `${currency.code}|${currency.locale}`;
  for (const opt of Array.from(sel.options)) {
    if (opt.value === wanted) sel.value = wanted;
  }
  sel.addEventListener('change', () => {
    const [code, locale] = sel.value.split('|');
    if (!code || !locale) return;
    currency = { code, locale };
    try { localStorage.setItem(CURRENCY_KEY, JSON.stringify(currency)); } catch { /* ignore */ }
    refreshDynamic();
  });
}

// ---------- tabs ----------
function initTabs(): void {
  const tabs: ReadonlyArray<readonly [string, string]> = [
    ['tab-costplus', 'panel-costplus'],
    ['tab-value', 'panel-value'],
    ['tab-breakeven', 'panel-breakeven'],
  ];
  for (const [tabId] of tabs) {
    $(tabId).addEventListener('click', () => {
      for (const [t2, p2] of tabs) {
        $(t2).setAttribute('aria-selected', String(t2 === tabId));
        $(p2).hidden = t2 !== tabId;
      }
    });
  }
}

// ---------- error helpers ----------
function showError(boxId: string, key: string): void {
  const box = $(boxId);
  box.textContent = i18n.t(key);
  box.hidden = false;
}

function hideError(boxId: string): void {
  $(boxId).hidden = true;
}

// ---------- cost plus ----------
interface CostPlusState {
  productionCost: number; overhead: number; totalCost: number;
  suggestedPrice: number; profit: number;
}
let lastCostPlus: CostPlusState | null = null;

function runCostPlus(): void {
  hideError('cp-error');
  const materials = parseFloat(($('cp-materials') as HTMLInputElement).value);
  const laborHours = parseFloat(($('cp-laborHours') as HTMLInputElement).value);
  const hourlyRate = parseFloat(($('cp-hourlyRate') as HTMLInputElement).value);
  if ([materials, laborHours, hourlyRate].some((v) => Number.isNaN(v))) {
    showError('cp-error', 'err.required');
    return;
  }
  const overheadPct = parseFloat(($('cp-overheadPct') as HTMLInputElement).value) || 0;
  const marginPct = parseFloat(($('cp-marginPct') as HTMLInputElement).value) || 0;

  const r = computeCostPlus(materials, laborHours, hourlyRate, overheadPct, marginPct);
  if (r === null || r === undefined) {
    showError('cp-error', 'err.noResult');
    $('cp-result').hidden = true;
    lastCostPlus = null;
    return;
  }
  lastCostPlus = {
    productionCost: r.productionCost,
    overhead: r.overhead,
    totalCost: r.totalCost,
    suggestedPrice: r.suggestedPrice,
    profit: r.profit,
  };
  $('cp-r-production').textContent = fmt(lastCostPlus.productionCost);
  $('cp-r-overhead').textContent = fmt(lastCostPlus.overhead);
  $('cp-r-totalcost').textContent = fmt(lastCostPlus.totalCost);
  $('cp-r-price').textContent = fmt(lastCostPlus.suggestedPrice);
  $('cp-r-profit').textContent = fmt(lastCostPlus.profit);
  const charm = psychological(lastCostPlus.suggestedPrice, 'charm');
  $('cp-charm').textContent = charm === null || charm === undefined ? '—' : `${fmt(charm)} (${currency.code})`;
  $('cp-result').hidden = false;
}

// ---------- value based ----------
interface ValueState { anchors: number[]; multiplier: number; median: number; min: number; max: number; referencePrice: number }
let lastValue: ValueState | null = null;

function parseAnchors(raw: string): number[] {
  return String(raw)
    .split(/[,;\s]+/)
    .map((s) => parseFloat(s.replace(',', '.')))
    .filter((v) => Number.isFinite(v));
}

function runValue(): void {
  hideError('vb-error');
  const anchors = parseAnchors(($('vb-anchors') as HTMLInputElement).value);
  const multiplier = parseFloat(($('vb-multiplier') as HTMLInputElement).value) || 1;
  const r = computeValueBased(new Float64Array(anchors), multiplier);
  if (r === null || r === undefined) {
    showError('vb-error', 'err.noResult');
    $('vb-result').hidden = true;
    lastValue = null;
    return;
  }
  lastValue = {
    anchors,
    multiplier,
    median: r.median,
    min: r.min,
    max: r.max,
    referencePrice: r.referencePrice,
  };
  $('vb-r-min').textContent = fmt(r.min);
  $('vb-r-median').textContent = fmt(r.median);
  $('vb-r-max').textContent = fmt(r.max);
  $('vb-r-ref').textContent = fmt(r.referencePrice);
  $('vb-result').hidden = false;
}

// ---------- break even ----------
interface BreakEvenState { fixed: number; price: number; variable: number; units: number | null; revenue: number | null }
let lastBreakEven: BreakEvenState | null = null;

function runBreakEven(): void {
  hideError('be-error');
  const fixed = parseFloat(($('be-fixed') as HTMLInputElement).value);
  const price = parseFloat(($('be-price') as HTMLInputElement).value);
  const variable = parseFloat(($('be-variable') as HTMLInputElement).value);
  if ([fixed, price, variable].some((v) => Number.isNaN(v))) {
    showError('be-error', 'err.required');
    return;
  }
  const r = breakEvenUnits(fixed, price, variable);
  if (r === null || r === undefined || r.units === undefined) {
    // never breaks even (price <= variable cost) or bad input
    lastBreakEven = null;
    $('be-r-units').textContent = '∞';
    $('be-r-revenue').textContent = '—';
    $('be-r-contribution').textContent = r ? fmt(price - variable) : '—';
    $('be-warn').hidden = false;
    $('be-result').hidden = false;
    if (!r) showError('be-error', 'err.noResult');
    return;
  }
  lastBreakEven = { fixed, price, variable, units: r.units, revenue: r.revenue ?? null };
  $('be-warn').hidden = true;
  $('be-r-units').textContent = String(r.units);
  $('be-r-revenue').textContent = fmt(r.revenue ?? 0);
  $('be-r-contribution').textContent = fmt(price - variable);
  $('be-result').hidden = false;
}

// ---------- saved scenarios ----------
const SAVED_KEY = 'pc_scenarios';

function loadSaved(): unknown[] {
  try {
    const arr = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]') as unknown;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function persistSaved(list: unknown[]): void {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, 100))); } catch { /* quota */ }
  renderSaved();
}

function renderSaved(): void {
  const list = loadSaved() as Record<string, unknown>[];
  const ul = $('saved-list');
  ul.innerHTML = '';
  ($('saved-empty') as HTMLElement).hidden = list.length > 0;
  list.forEach((sc) => {
    const li = document.createElement('li');
    li.className = 'saved-item';

    const main = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = String(sc.label ?? '');
    const detail = document.createElement('span');
    detail.className = 'saved-detail';
    const when = typeof sc.iso === 'string' && !Number.isNaN(Date.parse(sc.iso))
      ? new Date(sc.iso).toLocaleDateString() : '';
    detail.textContent = `${when} · ${String(sc.summary ?? '')}`;
    main.append(title, detail);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'mini danger';
    del.textContent = i18n.t('saved.delete');
    const label = String(sc.label ?? '');
    del.setAttribute('aria-label', `${i18n.t('saved.delete')}: ${label}`);
    const id = sc.id !== undefined ? String(sc.id) : '';
    del.addEventListener('click', () => {
      persistSaved(loadSaved().filter((s) => (s as Record<string, unknown>).id !== id));
    });

    li.append(main, del);
    ul.appendChild(li);
  });
}

function saveScenario(label: string, summary: string, data: unknown): void {
  const list = loadSaved();
  list.unshift({
    id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label,
    summary,
    iso: new Date().toISOString(),
    currency: { ...currency },
    data,
  });
  persistSaved(list.slice(0, 100));
}

function wireSaveButtons(): void {
  $('cp-save').addEventListener('click', () => {
    if (!lastCostPlus) return;
    saveScenario(
      `${i18n.t('tabs.costplus')} · ${fmt(lastCostPlus.suggestedPrice)}`,
      `${i18n.t('cp.r.profit')}: ${fmt(lastCostPlus.profit)}`,
      lastCostPlus
    );
  });
  $('vb-save').addEventListener('click', () => {
    if (!lastValue) return;
    saveScenario(
      `${i18n.t('tabs.value')} · ${fmt(lastValue.referencePrice)}`,
      `${i18n.t('vb.r.median')}: ${fmt(lastValue.median)}`,
      lastValue
    );
  });
  $('be-save').addEventListener('click', () => {
    if (!lastBreakEven || lastBreakEven.units === null) return;
    saveScenario(
      `${i18n.t('tabs.breakeven')} · ${lastBreakEven.units}`,
      `${i18n.t('be.r.revenue')}: ${fmt(lastBreakEven.revenue ?? 0)}`,
      lastBreakEven
    );
  });
}

// ---------- export / import / clear ----------
function exportJson(): void {
  const payload = JSON.stringify(
    { app: 'pricecraft', exportedAt: new Date().toISOString(), scenarios: loadSaved() },
    null,
    2
  );
  const blob = new Blob([payload], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pricecraft-scenarios-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJson(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result)) as Record<string, unknown>;
      const incoming = Array.isArray(parsed) ? parsed : parsed.scenarios;
      if (!Array.isArray(incoming)) throw new Error('bad shape');
      const merged = [...incoming.filter((s) => s && typeof s === 'object' && 'label' in s), ...loadSaved()];
      persistSaved(merged.slice(0, 200));
    } catch { /* invalid file → silently ignored */ }
  };
  reader.readAsText(file);
}

// ---------- re-render on language/currency change ----------
function refreshDynamic(): void {
  if (lastCostPlus) runCostPlus();
  if (lastValue) runValue();
  if (lastBreakEven) runBreakEven();
  renderSaved();
}

// ---------- boot ----------
export async function boot(): Promise<void> {
  await init();          // instantiate the Rust engine (.wasm)
  await i18n.initLanguage();
  initCurrency();
  initTabs();

  $('form-costplus').addEventListener('submit', (e) => { e.preventDefault(); runCostPlus(); });
  $('form-value').addEventListener('submit', (e) => { e.preventDefault(); runValue(); });
  $('form-breakeven').addEventListener('submit', (e) => { e.preventDefault(); runBreakEven(); });

  $('cp-use-charm').addEventListener('click', () => {
    if (!lastCostPlus) return;
    const charm = psychological(lastCostPlus.suggestedPrice, 'charm');
    if (charm === null || charm === undefined) return;
    ($('cp-marginPct') as HTMLInputElement).value = '';
    lastCostPlus = { ...lastCostPlus, suggestedPrice: charm, profit: Math.round((charm - lastCostPlus.totalCost) * 100) / 100 };
    $('cp-r-price').textContent = fmt(charm);
    $('cp-r-profit').textContent = fmt(lastCostPlus.profit);
    $('cp-charm').textContent = `${fmt(charm)} (${currency.code})`;
  });

  wireSaveButtons();
  $('btn-export').addEventListener('click', exportJson);
  $('file-import').addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) importJson(input.files[0]);
    input.value = '';
  });
  $('btn-clear').addEventListener('click', () => {
    if (loadSaved().length === 0) return;
    if (window.confirm(`${i18n.t('saved.clear')}?`)) persistSaved([]);
  });

  ($('lang-select') as HTMLSelectElement).addEventListener('change', (e) => {
    const sel = e.target as HTMLSelectElement;
    void i18n.setLanguage(sel.value).then(() => refreshDynamic());
  });

  renderSaved();
}

void boot();
