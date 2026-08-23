// PriceCraft - Cost-Plus pricing calculator (client-side only, zero dependencies)
// i18n, localStorage, PWA-ready, offline-first

const i18n = {
  en: {
    appName: "PriceCraft",
    calcTitle: "Cost-Plus Pricing",
    costLabel: "Cost (USD)",
    markupLabel: "Markup (%)",
    calculateBtn: "Calculate Price",
    priceLabel: "Calculated Price",
    newCalcBtn: "New Calculation",
    footerBuilt: "Built by @chr-z",
    footerOffline: "Offline-first PWA"
  },
  ptBR: {
    appName: "PriceCraft",
    calcTitle: "Precificação com Custo",
    costLabel: "Custo (USD)",
    markupLabel: "Margem (%):",
    calculateBtn: "Calcular Preço",
    priceLabel: "Preço Calculado",
    newCalcBtn: "Novo Cálculo",
    footerBuilt: "Built by @chr-z",
    footerOffline: "PWA Offline-first"
  }
};

let currentLocale = 'en';
let supportedLocales = ['en', 'pt-BR'];

async function loadLocale(locale) {
  try {
    const res = await fetch(`/locales/${locale}.json`);
    if (res.ok) {
      const data = await res.json();
      applyLocale(data);
      currentLocale = locale;
      return;
    }
  } catch (e) {
    console.warn("Locale load failed, using inline:", e);
  }
  applyLocale(i18n.en);
  currentLocale = 'en';
}

function applyLocale(data) {
  document.title = `${data.appName} | ${data.calcTitle}`;
  const h1 = document.querySelector('header h1');
  if (h1) h1.textContent = data.calcTitle;
  const labels = document.querySelectorAll('label');
  // Update labels by their for attributes
  const costInput = document.getElementById('cost');
  const markupInput = document.getElementById('markup');
  if (costInput) costInput.parentElement.previousElementSibling.textContent = data.costLabel;
  if (markupInput) markupInput.parentElement.previousElementSibling.textContent = data.markupLabel;
  const btn = document.getElementById('calculate');
  if (btn) btn.textContent = data.calculateBtn;
}

// Pure calculation functions — testable
function calculateCostPlus(cost, markupPct) {
  if (typeof cost !== 'number' || typeof markupPct !== 'number') return null;
  if (cost < 0 || markupPct < 0) return null;
  return cost * (1 + markupPct / 100);
}

function formatPrice(num) {
  return num.toFixed(2);
}

// DOM elements
let elements = {
  costInput: null,
  markupInput: null,
  calculateBtn: null,
  resultsSection: null,
  priceDisplay: null,
  newCalcBtn: null
};

function initElements() {
  elements = {
    costInput: document.getElementById('cost'),
    markupInput: document.getElementById('markup'),
    calculateBtn: document.getElementById('calculate'),
    resultsSection: document.getElementById('results'),
    priceDisplay: document.getElementById('price'),
    newCalcBtn: document.getElementById('new-calc')
  };
}

function showResults(price) {
  if (elements.priceDisplay) elements.priceDisplay.textContent = formatPrice(price);
  if (elements.resultsSection) elements.resultsSection.style.display = 'block';
  const titleEl = document.getElementById('result-title');
  if (titleEl) titleEl.textContent = currentLocale === 'pt-BR' ? 'Preço Calculado' : 'Calculated Price';
}

function hideResults() {
  if (elements.resultsSection) elements.resultsSection.style.display = 'none';
}

function handleCalculate() {
  const cost = parseFloat(elements.costInput.value) || 0;
  const markup = parseFloat(elements.markupInput.value) || 0;
  const price = calculateCostPlus(cost, markup);
  if (price !== null) {
    showResults(price);
  }
}

function handleNewCalc() {
  if (elements.costInput) elements.costInput.value = '';
  if (elements.markupInput) elements.markupInput.value = '';
  hideResults();
}

// Event listeners
function initEvents() {
  if (elements.calculateBtn) {
    elements.calculateBtn.addEventListener('click', handleCalculate);
  }
  if (elements.newCalcBtn) {
    elements.newCalcBtn.addEventListener('click', handleNewCalc);
  }
  if (elements.costInput) {
    elements.costInput.addEventListener('input', () => { if (elements.resultsSection && elements.resultsSection.style.display !== 'none') hideResults(); });
  }
  if (elements.markupInput) {
    elements.markupInput.addEventListener('input', () => { if (elements.resultsSection && elements.resultsSection.style.display !== 'none') hideResults(); });
  }
}

// Locale selector
function initLocaleSelector() {
  const selector = document.getElementById('locale-selector');
  if (!selector) return;
  selector.addEventListener('change', (e) => {
    loadLocale(e.target.value).catch(() => {});
  });
}

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => { console.log('SW registered:', registration.scope); })
      .catch(registrationError => { console.warn('SW registration failed:', registrationError); });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initElements();
  initEvents();
  initLocaleSelector();
  loadLocale(currentLocale).then(() => {});
});
