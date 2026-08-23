// PriceCraft — pure pricing engine (no DOM). Testable with `node --test`.
'use strict';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Cost-plus pricing.
 * @param {object} p
 * @param {number} p.materials      raw material cost per unit
 * @param {number} p.laborHours     hours of work per unit
 * @param {number} p.hourlyRate     what your hour is worth
 * @param {number} p.overheadPct    overhead (tools, rent, utilities) as % of production cost
 * @param {number} p.marginPct      desired profit margin on final price (%)
 * @returns {{productionCost:number, overhead:number, totalCost:number,
 *          suggestedPrice:number, profit:number}|null}
 */
function computeCostPlus(p = {}) {
  const materials = Number(p.materials);
  const laborHours = Number(p.laborHours);
  const hourlyRate = Number(p.hourlyRate);
  if (![materials, laborHours, hourlyRate].every((v) => Number.isFinite(v) && v >= 0)) return null;

  const overheadPct = clampPct(p.overheadPct);
  const marginPct = clampPct(p.marginPct);

  const laborCost = laborHours * hourlyRate;
  const productionCost = materials + laborCost;
  const overhead = productionCost * (overheadPct / 100);
  const totalCost = productionCost + overhead;
  // price such that (price - totalCost)/price === marginPct/100  →  price = cost/(1-m)
  const m = marginPct / 100;
  const rawPrice = m < 1 ? totalCost / (1 - m) : null;
  if (rawPrice === null || !Number.isFinite(rawPrice)) return null;

  // Round first, then derive profit from the *displayed* values so the UI adds up.
  const suggestedPrice = round2(rawPrice);
  const displayedCost = round2(totalCost);
  return {
    productionCost: round2(productionCost),
    overhead: round2(overhead),
    totalCost: displayedCost,
    suggestedPrice,
    profit: round2(suggestedPrice - displayedCost),
  };
}

/**
 * Value-based pricing from competitor anchors + differentiation multiplier.
 * Anchors below/above the median pull the reference price; the multiplier
 * expresses how much more (or less) customers perceive your product's worth.
 * @param {number[]} anchors   competitor prices
 * @param {number}   multiplier perceived-value multiplier (0.5 … 3)
 * @returns {{median:number, min:number, max:number, referencePrice:number}|null}
 */
function computeValueBased(anchors, multiplier) {
  if (!Array.isArray(anchors)) return null;
  const nums = anchors.map(Number).filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mult = Number(multiplier);
  if (!Number.isFinite(mult) || mult <= 0) return null;
  const clamped = Math.min(Math.max(mult, 0.1), 10);

  const mid = Math.floor(nums.length / 2);
  const median = nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;

  return {
    median: round2(median),
    min: round2(nums[0]),
    max: round2(nums[nums.length - 1]),
    referencePrice: round2(median * clamped),
  };
}

/**
 * Psychological price endings.
 * mode "charm": 49.00 → 48.90-ish (round down to .90/.99 ending)
 * mode "round": 48.62 → 49.00 (next clean number)
 * @returns {number|null}
 */
function psychological(price, mode) {
  const n = Number(price);
  if (!Number.isFinite(n) || n < 0) return null;
  if (mode === 'charm') {
    // Largest price ending in .90 / .95 / .99 that is strictly below n.
    const base = Math.floor(n);
    const candidates = [
      base - 1 + 0.99, base - 1 + 0.95, base - 1 + 0.9,
      base + 0.99, base + 0.95, base + 0.9,
    ].sort((a, b) => b - a);
    const hit = candidates.find((c) => c < n && c >= 0);
    return hit === undefined ? null : round2(hit);
  }
  if (mode === 'round') {
    if (n === Math.trunc(n)) return n;
    return Math.ceil(n);
  }
  return null;
}

/** Margin (%) → markup (%):  m = mu/(1+mu) */
function markupFromMargin(marginPct) {
  const m = Number(marginPct);
  if (!Number.isFinite(m) || m < 0 || m >= 100) return null;
  return round2((m / 100 / (1 - m / 100)) * 100);
}

/** Markup (%) → margin (%):  mu = m/(1-m) inverse */
function marginFromMarkup(markupPct) {
  const mu = Number(markupPct);
  if (!Number.isFinite(mu) || mu < 0) return null;
  return round2((mu / 100 / (1 + mu / 100)) * 100);
}

/**
 * Break-even point.
 * @returns {{units:number|null, revenue:number|null}} units=null when price ≤ variable cost
 */
function breakEvenUnits(fixedCosts, pricePerUnit, variableCostPerUnit) {
  const fixed = Number(fixedCosts);
  const price = Number(pricePerUnit);
  const variable = Number(variableCostPerUnit);
  if (![fixed, price, variable].every((v) => Number.isFinite(v))) return null;
  if (fixed < 0 || price < 0 || variable < 0) return null;
  const contribution = price - variable;
  if (contribution <= 0) return { units: null, revenue: null };
  const units = Math.ceil(fixed / contribution);
  return { units, revenue: round2(units * price) };
}

/**
 * Currency formatting with configurable code + locale.
 * Falls back gracefully when Intl lacks a locale (e.g. Node without full ICU).
 * @param {number} value
 * @param {{code?:string, locale?:string}} opts  defaults USD/en-US
 */
function formatCurrency(value, opts = {}) {
  const num = Number(value);
  const code = String(opts.code || 'USD');
  const locale = String(opts.locale || 'en-US');
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(
      Number.isFinite(num) ? num : 0
    );
  } catch {
    const amount = (Number.isFinite(num) ? num : 0).toFixed(2);
    return `${code} ${amount}`;
  }
}

function clampPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 100);
}

export {
  computeCostPlus,
  computeValueBased,
  psychological,
  markupFromMargin,
  marginFromMarkup,
  breakEvenUnits,
  formatCurrency,
  round2,
};
