<div align="center">

<img src="docs/hero.svg" alt="PriceCraft — price your work with confidence" width="100%" />

# 💲 PriceCraft

**Cost-plus & value-based pricing calculator for makers — powered by a Rust/WASM engine. Free, private, offline-first.**
**Calculadora de preço custo+margem e valor percebido para artesãos e makers — motor de cálculo em Rust compilado para WebAssembly.**

[![CI](https://github.com/chr-z/pricecraft/actions/workflows/ci.yml/badge.svg)](https://github.com/chr-z/pricecraft/actions/workflows/ci.yml)
[![Deploy](https://github.com/chr-z/pricecraft/actions/workflows/pages.yml/badge.svg)](https://github.com/chr-z/pricecraft/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-14b8a6.svg)](LICENSE)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20PT--BR-blueviolet)](#internationalization--internacionaliza%C3%A7%C3%A3o)
[![Rust](https://img.shields.io/badge/engine-Rust%20%E2%86%92%20WASM-dea584?logo=rust&logoColor=black)](engine/)
[![PWA](https://img.shields.io/badge/PWA-installable-9cf)](public/manifest.json)

🔗 **Live demo → [chr-z.github.io/pricecraft](https://chr-z.github.io/pricecraft/)** · no signup, works offline after first load

</div>

---

Underpricing is the #1 mistake makers make. PriceCraft fixes that in under a minute: enter your
materials and hours once, get a **defensible price** backed by two proven methods —
**cost-plus** (your costs + a healthy margin) and **value-based** (anchored on the market median,
scaled by how much extra worth customers perceive). A built-in **break-even** panel tells you
exactly how many units pay the bills.

Everything runs in your browser. No account, no server, no telemetry — your pricing strategy is
nobody's business but yours.

> 🇧🇷 Sabe aquele preço "no feeling" que depois dá prejuízo? O PriceCraft calcula custo real,
> margem saudável, compara com o mercado e mostra o ponto de equilíbrio. Interface em português
> ou inglês, moeda em R$, US$, €, £, ¥ ou ₹.

## 🦀 Built with Rust → WebAssembly (v2)

Every pricing formula lives in a **pure-Rust crate** ([`engine/`](engine/)) compiled to a
27 KB `.wasm` binary via `wasm-bindgen` + `wasm-pack`. The TypeScript UI is a thin DOM layer —
zero math in JS.

```
engine/src/lib.rs      ← all pricing math (cost-plus, value-based, break-even…)
  └── wasm-pack build --target web
        └── src/pkg/pricecraft_engine_bg.wasm   (27 KB, size-optimized)
              └── imported by src/app.ts like any ES module
```

Why? Deterministic float handling, memory safety without a GC, and a typed boundary
(`.d.ts` generated straight from Rust signatures). The same vectors are tested twice:
16 native `cargo test` cases **plus** 17 Vitest cases running the actual compiled `.wasm`.

## ✨ Features

| | |
|---|---|
| 🧮 **Cost-plus engine** | Materials + labor + overhead → total cost; margin applied correctly as `price = cost / (1 − margin)`, not the classic ×1.5 guess |
| 📊 **Value-based analyzer** | Enter competitor prices, get median/range and a reference price scaled by your differentiation multiplier |
| ⚖️ **Break-even panel** | Fixed costs, unit economics → exact units to sell before profit starts |
| 🪄 **Charm endings** | One click converts `144.00` into `143.99`-style retail prices |
| 💱 **Six currencies** | USD, EUR, GBP, BRL, JPY, INR with proper locale formatting (`R$ 1.234,50` vs `$1,234.50`) via `Intl` |
| 🌎 **EN / PT-BR interface** | Header switcher, persisted choice, plain JSON dictionaries — add a language by adding one file |
| 💾 **Scenario library** | Save every calculation, export/import everything as JSON, delete what's stale |
| 📲 **Installable PWA** | Manifest + service worker with stale-while-revalidate caching: opens offline, installs on phone/desktop |
| 🛡️ **Private by design** | Zero network calls at runtime, zero cookies, zero telemetry — your inputs never leave the device |
| ♿ **Accessible** | Keyboard-navigable tabs with ARIA roles, focus-visible rings, reduced-motion support |

## 🧠 How the math works (the senior-engineer part)

Most pricing calculators do `cost × 1.5` and call it a day — that confuses **margin** with
**markup**. PriceCraft gets it right (in Rust):

```rust
production_cost = materials + hours * hourly_rate;
total_cost      = production_cost * (1.0 + overhead_pct / 100.0);
suggested_price = total_cost / (1.0 - margin_pct / 100.0);   // margin on PRICE, not on cost
profit          = suggested_price - total_cost;
units           = (fixed_costs / (price - variable_cost)).ceil();
reference_price = median(competitor_anchors) * differentiation_multiplier;
```

Every formula is covered by **16 native Rust tests + 17 Vitest tests on the compiled .wasm**
— identical known-answer vectors in both worlds, enforced in CI.

## 🚀 Quick start

1. Open the [live demo](https://chr-z.github.io/pricecraft/)
2. Pick your currency & language in the header
3. **Cost-plus**: enter materials, hours, hourly rate, overhead % and target margin → get your price
4. Cross-check against competitors in the **Value-based** tab
5. Hit **Save scenario**, compare later, export JSON whenever you want

## 🖼️ Screenshots

> Coming soon — meanwhile the [demo](https://chr-z.github.io/pricecraft/) loads in under 2 seconds,
> even on a phone.

## 💰 Pricing

PriceCraft itself is free forever — it's a portfolio piece, not a product.
No premium tier, no locked features, no ads, no "pro" nag screen. Take the math, run your shop.

## 🛠️ Development

```bash
# Prerequisites: Rust (stable + wasm32-unknown-unknown), wasm-pack, Node 22+

wasm-pack build engine --target web --out-dir ../src/pkg --out-name pricecraft_engine
npm install
npm run dev            # Vite dev server with hot reload
npm test               # Vitest against the real .wasm bundle
cd engine && cargo test  # native Rust tests of the same vectors
npm run build          # production build to dist/
```

## 🌎 Internationalization / Internacionalização

- `en.json` / `pt-BR.json` live in [`public/locales/`](public/locales/) as flat key-value dictionaries
- The choice persists in `localStorage`; browser language auto-detects on first visit
- Add a language by dropping one JSON file and one `<option>` in `src/main.ts`

## 📄 License

MIT — see [LICENSE](LICENSE).

---

Built by [@chr-z](https://github.com/chr-z) · engine in 🦀 Rust → WASM · UI in TypeScript + Vite
