/* tslint:disable */
/* eslint-disable */

/**
 * Break-even result; `units === null` over JS means "never breaks even".
 */
export class BreakEvenResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly revenue: number | undefined;
    readonly units: number | undefined;
}

/**
 * Cost-plus result.
 */
export class CostPlusResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly overhead: number;
    readonly productionCost: number;
    readonly profit: number;
    readonly suggestedPrice: number;
    readonly totalCost: number;
}

/**
 * Value-based result.
 */
export class ValueBasedResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly max: number;
    readonly median: number;
    readonly min: number;
    readonly referencePrice: number;
}

/**
 * Break-even point. `units = None` when price <= variable cost (never breaks even).
 */
export function breakEvenUnits(fixed_costs: number, price_per_unit: number, variable_cost_per_unit: number): BreakEvenResult | undefined;

/**
 * Cost-plus pricing: materials + labor + overhead, then margin applied on
 * PRICE (`price = cost / (1 - m)`), not the classic x1.5 markup guess.
 * Returns `None` (JS `null`) for negative/NaN inputs or an impossible margin.
 */
export function computeCostPlus(materials: number, labor_hours: number, hourly_rate: number, overhead_pct: number, margin_pct: number): CostPlusResult | undefined;

/**
 * Value-based pricing from competitor anchor prices + differentiation multiplier.
 * Anchors are filtered to finite positive values and sorted; the reference is
 * `median * multiplier`, with the multiplier clamped to [0.1, 10].
 */
export function computeValueBased(anchors: Float64Array, multiplier: number): ValueBasedResult | undefined;

/**
 * Markup (%) -> margin (%): m = mu / (1 + mu).
 */
export function marginFromMarkup(markup_pct: number): number | undefined;

/**
 * Margin (%) -> markup (%): mu = m / (1 - m).
 */
export function markupFromMargin(margin_pct: number): number | undefined;

/**
 * Psychological price endings.
 * `mode = "charm"`: largest price ending in .90/.95/.99 strictly below `price`.
 * `mode = "round"`: next clean integer (identity when already integral).
 */
export function psychological(price: number, mode: string): number | undefined;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_breakevenresult_free: (a: number, b: number) => void;
    readonly __wbg_costplusresult_free: (a: number, b: number) => void;
    readonly __wbg_valuebasedresult_free: (a: number, b: number) => void;
    readonly breakEvenUnits: (a: number, b: number, c: number) => number;
    readonly breakevenresult_revenue: (a: number) => [number, number];
    readonly breakevenresult_units: (a: number) => number;
    readonly computeCostPlus: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly computeValueBased: (a: number, b: number, c: number) => number;
    readonly costplusresult_overhead: (a: number) => number;
    readonly costplusresult_productionCost: (a: number) => number;
    readonly costplusresult_profit: (a: number) => number;
    readonly costplusresult_suggestedPrice: (a: number) => number;
    readonly costplusresult_totalCost: (a: number) => number;
    readonly marginFromMarkup: (a: number) => [number, number];
    readonly markupFromMargin: (a: number) => [number, number];
    readonly psychological: (a: number, b: number, c: number) => [number, number];
    readonly valuebasedresult_max: (a: number) => number;
    readonly valuebasedresult_median: (a: number) => number;
    readonly valuebasedresult_min: (a: number) => number;
    readonly valuebasedresult_referencePrice: (a: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
