// PriceCraft — UI wiring. All math lives in core.js (tested); this file only glues DOM.
'use strict';

import {
  computeCostPlus,
  computeValueBased,
  psychological,
  breakEvenUnits,
  formatCurrency,
} from './core.js';

const $ = (id) => document.getElementById(id);

// ---------- currency ----------
const CURRENCY_KEY = 'pc_currency';
let currency = { code: 'USD', locale: 'en-US' };
try {
  const saved = JSON.parse(localStorage.getItem(CURRENCY_KEY) || 'null');
  if (saved && saved.code && saved.locale) currency = saved;
} catch { /* default */ }

function fmt(n) {
  return formatCurrency(n, currency);
}

function initCurrency() {
  const sel = $('currency-select');
  if (!sel) return;
  const wanted = `${currency.code}|${currency.locale}`;
  for (const opt of sel.options) {
    if (opt.value === wanted) sel.value = wanted;
  }
  sel.addEventListener('change', () => {
    const [code, locale] = sel.value.split('|');
    currency = { code, locale };
    try { localStorage.setItem(CURRENCY_KEY, JSON.stringify(currency)); } catch { /* ignore */ }
    document.dispatchEvent(new CustomEvent('pricecraft:currencychange'));
  });
}

// ---------- tabs ----------
function initTabs() {
  const tabs = [
    ['tab-costplus', 'panel-costplus'],
    ['tab-value', 'panel-value'],
    ['tab-breakeven', 'panel-breakeven'],
  ];
  for (const [tabId, panelId] of tabs) {
    $(tabId).addEventListener('click', () => {
      for (const [t2, p2] of tabs) {
        $(t2).setAttribute('aria-selected', String(t2 === tabId));
        $(p2).hidden = t2 !== tabId;
      }
    });
  }
}

// ---------- error helpers ----------
function showError(boxId, key) {
  const box = $(boxId);
  box.textContent = window.PCI18N.t(key);
  box.hidden = false;
}

function hideError(boxId) {
  $(boxId).hidden = true;
}

// ---------- cost plus ----------
let lastCostPlus = null;

function runCostPlus() {
  hideError('cp-error');
  const materials = parseFloat($('cp-materials').value);
  const laborHours = parseFloat($('cp-laborHours').value);
  const hourlyRate = parseFloat($('cp-hourlyRate').value);
  if ([materials, laborHours, hourlyRate].some((v) => Number.isNaN(v))) {
    showError('cp-error', 'err.required');
    return;
  }
  const overheadPct = parseFloat($('cp-overheadPct').value) || 0;
  const marginPct = parseFloat($('cp-marginPct').value) || 0;
  const r = computeCostPlus({ materials, laborHours, hourlyRate, overheadPct, marginPct });
  if (!r) {
    showError('cp-error', 'err.noResult');
    $('cp-result').hidden = true;
    lastCostPlus = null;
    return;
  }
  lastCostPlus = r;
  $('cp-r-production').textContent = fmt(r.productionCost);
  $('cp-r-overhead').textContent = fmt(r.overhead);
  $('cp-r-totalcost').textContent = fmt(r.totalCost);
  $('cp-r-price').textContent = fmt(r.suggestedPrice);
  $('cp-r-profit').textContent = fmt(r.profit);
  const charm = psychological(r.suggestedPrice, 'charm');
  $('cp-charm').textContent = charm === null ? '—' : `${fmt(charm)} (${currency.code})`;
  $('cp-result').hidden = false;
}

// ---------- value based ----------
let lastValue = null;

function parseAnchors(raw) {
  return String(raw)
    .split(/[,;\s]+/)
    .map((s) => parseFloat(s.replace(',', '.')))
    .filter((v) => Number.isFinite(v));
}

function runValue() {
  hideError('vb-error');
  const anchors = parseAnchors($('vb-anchors').value);
  const multiplier = parseFloat($('vb-multiplier').value) || 1;
  const r = computeValueBased(anchors, multiplier);
  if (!r) {
    showError('vb-error', 'err.noResult');
    $('vb-result').hidden = true;
    lastValue = null;
    return;
  }
  lastValue = { anchors, multiplier, ...r };
  $('vb-r-min').textContent = fmt(r.min);
  $('vb-r-median').textContent = fmt(r.median);
  $('vb-r-max').textContent = fmt(r.max);
  $('vb-r-ref').textContent = fmt(r.referencePrice);
  $('vb-result').hidden = false;
}

// ---------- break even ----------
let lastBreakEven = null;

function runBreakEven() {
  hideError('be-error');
  const fixed = parseFloat($('be-fixed').value);
  const price = parseFloat($('be-price').value);
  const variable = parseFloat($('be-variable').value);
  if ([fixed, price, variable].some((v) => Number.isNaN(v))) {
    showError('be-error', 'err.required');
    return;
  }
  const r = breakEvenUnits(fixed, price, variable);
  if (!r || r.units === null) {
    lastBreakEven = null;
    $('be-r-units').textContent = '∞';
    $('be-r-revenue').textContent = '—';
    $('be-r-contribution').textContent = r ? fmt(price - variable) : '—';
    $('be-warn').hidden = false;
    $('be-result').hidden = false;
    if (!r) showError('be-error', 'err.noResult');
    return;
  }
  lastBreakEven = { fixed, price, variable, ...r };
  $('be-warn').hidden = true;
  $('be-r-units').textContent = String(r.units);
  $('be-r-revenue').textContent = fmt(r.revenue);
  $('be-r-contribution').textContent = fmt(price - variable);
  $('be-result').hidden = false;
}

// ---------- saved scenarios ----------
const SAVED_KEY = 'pc_scenarios';

function loadSaved() {
  try {
    const arr = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function persistSaved(list) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch { /* quota */ }
  renderSaved();
}

function renderSaved() {
  const list = loadSaved();
  const ul = $('saved-list');
  ul.innerHTML = '';
  $('saved-empty').hidden = list.length > 0;
  list.forEach((sc) => {
    const li = document.createElement('li');
    li.className = 'saved-item';

    const main = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = sc.label;
    const detail = document.createElement('span');
    detail.className = 'saved-detail';
    detail.textContent = `${new Date(sc.iso).toLocaleDateString()} · ${sc.summary}`;
    main.append(title, detail);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'mini danger';
    del.textContent = window.PCI18N.t('saved.delete');
    del.setAttribute('aria-label', `${window.PCI18N.t('saved.delete')}: ${sc.label}`);
    del.addEventListener('click', () => {
      persistSaved(loadSaved().filter((s) => s.id !== sc.id));
    });

    li.append(main, del);
    ul.appendChild(li);
  });
}

function saveScenario(label, summary, data) {
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

function wireSaveButtons() {
  $('cp-save').addEventListener('click', () => {
    if (!lastCostPlus) return;
    saveScenario(
      `${window.PCI18N.t('tabs.costplus')} · ${fmt(lastCostPlus.suggestedPrice)}`,
      `${window.PCI18N.t('cp.r.profit')}: ${fmt(lastCostPlus.profit)}`,
      lastCostPlus
    );
  });
  $('vb-save').addEventListener('click', () => {
    if (!lastValue) return;
    saveScenario(
      `${window.PCI18N.t('tabs.value')} · ${fmt(lastValue.referencePrice)}`,
      `${window.PCI18N.t('vb.r.median')}: ${fmt(lastValue.median)}`,
      lastValue
    );
  });
  $('be-save').addEventListener('click', () => {
    if (!lastBreakEven) return;
    saveScenario(
      `${window.PCI18N.t('tabs.breakeven')} · ${lastBreakEven.units}`,
      `${window.PCI18N.t('be.r.revenue')}: ${fmt(lastBreakEven.revenue)}`,
      lastBreakEven
    );
  });
}

// ---------- export / import / clear ----------
function exportJson() {
  const payload = JSON.stringify({ app: 'pricecraft', exportedAt: new Date().toISOString(), scenarios: loadSaved() }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `pricecraft-scenarios-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const incoming = Array.isArray(parsed) ? parsed : parsed.scenarios;
      if (!Array.isArray(incoming)) throw new Error('bad shape');
      const merged = [...incoming.filter((s) => s && s.label), ...loadSaved()];
      persistSaved(merged.slice(0, 200));
    } catch { /* invalid file → silently ignored */ }
  };
  reader.readAsText(file);
}

// ---------- re-render on language/currency change ----------
function refreshDynamic() {
  if (lastCostPlus) runCostPlus();
  if (lastValue) runValue();
  if (lastBreakEven) runBreakEven();
  renderSaved();
}

// ---------- boot ----------
function boot() {
  initCurrency();
  initTabs();
  $('form-costplus').addEventListener('submit', (e) => { e.preventDefault(); runCostPlus(); });
  $('form-value').addEventListener('submit', (e) => { e.preventDefault(); runValue(); });
  $('form-breakeven').addEventListener('submit', (e) => { e.preventDefault(); runBreakEven(); });
  $('cp-use-charm').addEventListener('click', () => {
    const charm = psychological(lastCostPlus ? lastCostPlus.suggestedPrice : NaN, 'charm');
    if (charm === null || !lastCostPlus) return;
    $('cp-marginPct').value = '';
    // apply charm by pinning the suggested price via margin adjustment is overkill —
    // instead we show it as the chosen price in the KPI
    lastCostPlus = { ...lastCostPlus, suggestedPrice: charm, profit: Math.round((charm - lastCostPlus.totalCost) * 100) / 100 };
    $('cp-r-price').textContent = fmt(charm);
    $('cp-r-profit').textContent = fmt(lastCostPlus.profit);
    $('cp-charm').textContent = `${fmt(charm)} (${currency.code})`;
  });
  wireSaveButtons();
  $('btn-export').addEventListener('click', exportJson);
  $('file-import').addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) importJson(e.target.files[0]);
    e.target.value = '';
  });
  $('btn-clear').addEventListener('click', () => {
    if (loadSaved().length === 0) return;
    if (window.confirm(window.PCI18N.t('saved.clear') + '?')) persistSaved([]);
  });
  document.addEventListener('pricecraft:langchange', refreshDynamic);
  document.addEventListener('pricecraft:currencychange', refreshDynamic);
  renderSaved();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
