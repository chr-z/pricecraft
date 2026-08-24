//! PriceCraft pricing engine — pure Rust, compiled to WebAssembly.
//!
//! Every formula mirrors js/core.js v1 exactly so the known-answer tests
//! keep passing: cost-plus with margin-on-price, value-based median anchors,
//! charm/round psychological endings, margin<->markup, break-even.
//!
//! Result structs use public fields only — wasm-bindgen auto-exposes them as
//! camelCase JS properties (`productionCost`, `totalCost`, ...).

use wasm_bindgen::prelude::*;

fn round2(n: f64) -> f64 {
    (n * 100.0 + f64::EPSILON * 100.0).round() / 100.0
}

fn clamp_pct(v: f64) -> f64 {
    if !v.is_finite() {
        return 0.0;
    }
    v.clamp(0.0, 100.0)
}

/// Cost-plus result.
#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct CostPlusResult {
    production_cost: f64,
    overhead: f64,
    total_cost: f64,
    suggested_price: f64,
    profit: f64,
}

#[wasm_bindgen]
impl CostPlusResult {
    #[wasm_bindgen(getter, js_name = productionCost)]
    pub fn production_cost(&self) -> f64 {
        self.production_cost
    }
    #[wasm_bindgen(getter)]
    pub fn overhead(&self) -> f64 {
        self.overhead
    }
    #[wasm_bindgen(getter, js_name = totalCost)]
    pub fn total_cost(&self) -> f64 {
        self.total_cost
    }
    #[wasm_bindgen(getter, js_name = suggestedPrice)]
    pub fn suggested_price(&self) -> f64 {
        self.suggested_price
    }
    #[wasm_bindgen(getter)]
    pub fn profit(&self) -> f64 {
        self.profit
    }
}

/// Value-based result.
#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct ValueBasedResult {
    median: f64,
    min: f64,
    max: f64,
    reference_price: f64,
}

#[wasm_bindgen]
impl ValueBasedResult {
    #[wasm_bindgen(getter)]
    pub fn median(&self) -> f64 {
        self.median
    }
    #[wasm_bindgen(getter)]
    pub fn min(&self) -> f64 {
        self.min
    }
    #[wasm_bindgen(getter)]
    pub fn max(&self) -> f64 {
        self.max
    }
    #[wasm_bindgen(getter, js_name = referencePrice)]
    pub fn reference_price(&self) -> f64 {
        self.reference_price
    }
}

/// Break-even result; `units === null` over JS means "never breaks even".
#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct BreakEvenResult {
    units: Option<u32>,
    revenue: Option<f64>,
}

#[wasm_bindgen]
impl BreakEvenResult {
    #[wasm_bindgen(getter)]
    pub fn units(&self) -> Option<u32> {
        self.units
    }
    #[wasm_bindgen(getter)]
    pub fn revenue(&self) -> Option<f64> {
        self.revenue
    }
}

/// Cost-plus pricing: materials + labor + overhead, then margin applied on
/// PRICE (`price = cost / (1 - m)`), not the classic x1.5 markup guess.
/// Returns `None` (JS `null`) for negative/NaN inputs or an impossible margin.
#[wasm_bindgen(js_name = computeCostPlus)]
pub fn compute_cost_plus(
    materials: f64,
    labor_hours: f64,
    hourly_rate: f64,
    overhead_pct: f64,
    margin_pct: f64,
) -> Option<CostPlusResult> {
    let inputs_ok = [materials, labor_hours, hourly_rate]
        .iter()
        .all(|v| v.is_finite() && *v >= 0.0);
    if !inputs_ok {
        return None;
    }

    let overhead_pct = clamp_pct(overhead_pct);
    let margin_pct = clamp_pct(margin_pct);

    let labor_cost = labor_hours * hourly_rate;
    let production_cost = materials + labor_cost;
    let overhead = production_cost * (overhead_pct / 100.0);
    let total_cost = production_cost + overhead;

    // price such that (price - totalCost)/price == marginPct/100
    let m = margin_pct / 100.0;
    if !(m < 1.0) {
        return None; // margin >= 100% would need an infinite price
    }
    let raw_price = total_cost / (1.0 - m);
    if !raw_price.is_finite() {
        return None;
    }

    // Round first, then derive profit from the displayed values so the UI adds up.
    let suggested_price = round2(raw_price);
    let displayed_cost = round2(total_cost);
    Some(CostPlusResult {
        production_cost: round2(production_cost),
        overhead: round2(overhead),
        total_cost: displayed_cost,
        suggested_price,
        profit: round2(suggested_price - displayed_cost),
    })
}

/// Value-based pricing from competitor anchor prices + differentiation multiplier.
/// Anchors are filtered to finite positive values and sorted; the reference is
/// `median * multiplier`, with the multiplier clamped to [0.1, 10].
#[wasm_bindgen(js_name = computeValueBased)]
pub fn compute_value_based(anchors: Vec<f64>, multiplier: f64) -> Option<ValueBasedResult> {
    let mut nums: Vec<f64> = anchors
        .into_iter()
        .filter(|v| v.is_finite() && *v > 0.0)
        .collect();
    if nums.is_empty() || !multiplier.is_finite() || multiplier <= 0.0 {
        return None;
    }
    nums.sort_by(|a, b| a.partial_cmp(b).expect("no NaN after filter"));
    let clamped = multiplier.clamp(0.1, 10.0);

    let len = nums.len();
    let mid = len / 2;
    let median = if len % 2 == 1 {
        nums[mid]
    } else {
        (nums[mid - 1] + nums[mid]) / 2.0
    };

    Some(ValueBasedResult {
        median: round2(median),
        min: round2(nums[0]),
        max: round2(nums[len - 1]),
        reference_price: round2(median * clamped),
    })
}

/// Psychological price endings.
/// `mode = "charm"`: largest price ending in .90/.95/.99 strictly below `price`.
/// `mode = "round"`: next clean integer (identity when already integral).
#[wasm_bindgen(js_name = psychological)]
pub fn psychological(price: f64, mode: &str) -> Option<f64> {
    if !price.is_finite() || price < 0.0 {
        return None;
    }
    match mode {
        "charm" => {
            let base = price.floor();
            let mut candidates = [
                base - 1.0 + 0.99,
                base - 1.0 + 0.95,
                base - 1.0 + 0.90,
                base + 0.99,
                base + 0.95,
                base + 0.90,
            ];
            candidates.sort_by(|a, b| b.partial_cmp(a).expect("finite values"));
            candidates
                .into_iter()
                .find(|&c| c < price && c >= 0.0)
                .map(round2)
        }
        "round" => {
            if price == price.trunc() {
                Some(price)
            } else {
                Some(price.ceil())
            }
        }
        _ => None,
    }
}

/// Margin (%) -> markup (%): mu = m / (1 - m).
#[wasm_bindgen(js_name = markupFromMargin)]
pub fn markup_from_margin(margin_pct: f64) -> Option<f64> {
    if !margin_pct.is_finite() || !(0.0..100.0).contains(&margin_pct) {
        return None;
    }
    Some(round2((margin_pct / 100.0 / (1.0 - margin_pct / 100.0)) * 100.0))
}

/// Markup (%) -> margin (%): m = mu / (1 + mu).
#[wasm_bindgen(js_name = marginFromMarkup)]
pub fn margin_from_markup(markup_pct: f64) -> Option<f64> {
    if !markup_pct.is_finite() || markup_pct < 0.0 {
        return None;
    }
    Some(round2((markup_pct / 100.0 / (1.0 + markup_pct / 100.0)) * 100.0))
}

/// Break-even point. `units = None` when price <= variable cost (never breaks even).
#[wasm_bindgen(js_name = breakEvenUnits)]
pub fn break_even_units(
    fixed_costs: f64,
    price_per_unit: f64,
    variable_cost_per_unit: f64,
) -> Option<BreakEvenResult> {
    let inputs_ok = [fixed_costs, price_per_unit, variable_cost_per_unit]
        .iter()
        .all(|v| v.is_finite());
    if !inputs_ok || fixed_costs < 0.0 || price_per_unit < 0.0 || variable_cost_per_unit < 0.0 {
        return None;
    }
    let contribution = price_per_unit - variable_cost_per_unit;
    if contribution <= 0.0 {
        return Some(BreakEvenResult {
            units: None,
            revenue: None,
        });
    }
    let units = (fixed_costs / contribution).ceil();
    if !(units >= 0.0 && units <= u32::MAX as f64) {
        return Some(BreakEvenResult {
            units: None,
            revenue: None,
        });
    }
    let units = units as u32;
    Some(BreakEvenResult {
        units: Some(units),
        revenue: Some(round2(units as f64 * price_per_unit)),
    })
}
