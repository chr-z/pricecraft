/* @ts-self-types="./pricecraft_engine.d.ts" */

/**
 * Break-even result; `units === null` over JS means "never breaks even".
 */
export class BreakEvenResult {
    static __wrap(ptr) {
        const obj = Object.create(BreakEvenResult.prototype);
        obj.__wbg_ptr = ptr;
        BreakEvenResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BreakEvenResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_breakevenresult_free(ptr, 0);
    }
    /**
     * @returns {number | undefined}
     */
    get revenue() {
        const ret = wasm.breakevenresult_revenue(this.__wbg_ptr);
        return ret[0] === 0 ? undefined : ret[1];
    }
    /**
     * @returns {number | undefined}
     */
    get units() {
        const ret = wasm.breakevenresult_units(this.__wbg_ptr);
        return ret === Number.MAX_SAFE_INTEGER ? undefined : ret;
    }
}
if (Symbol.dispose) BreakEvenResult.prototype[Symbol.dispose] = BreakEvenResult.prototype.free;

/**
 * Cost-plus result.
 */
export class CostPlusResult {
    static __wrap(ptr) {
        const obj = Object.create(CostPlusResult.prototype);
        obj.__wbg_ptr = ptr;
        CostPlusResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CostPlusResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_costplusresult_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get overhead() {
        const ret = wasm.costplusresult_overhead(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get productionCost() {
        const ret = wasm.costplusresult_productionCost(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get profit() {
        const ret = wasm.costplusresult_profit(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get suggestedPrice() {
        const ret = wasm.costplusresult_suggestedPrice(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get totalCost() {
        const ret = wasm.costplusresult_totalCost(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) CostPlusResult.prototype[Symbol.dispose] = CostPlusResult.prototype.free;

/**
 * Value-based result.
 */
export class ValueBasedResult {
    static __wrap(ptr) {
        const obj = Object.create(ValueBasedResult.prototype);
        obj.__wbg_ptr = ptr;
        ValueBasedResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ValueBasedResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_valuebasedresult_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get max() {
        const ret = wasm.valuebasedresult_max(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get median() {
        const ret = wasm.valuebasedresult_median(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get min() {
        const ret = wasm.valuebasedresult_min(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get referencePrice() {
        const ret = wasm.valuebasedresult_referencePrice(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) ValueBasedResult.prototype[Symbol.dispose] = ValueBasedResult.prototype.free;

/**
 * Break-even point. `units = None` when price <= variable cost (never breaks even).
 * @param {number} fixed_costs
 * @param {number} price_per_unit
 * @param {number} variable_cost_per_unit
 * @returns {BreakEvenResult | undefined}
 */
export function breakEvenUnits(fixed_costs, price_per_unit, variable_cost_per_unit) {
    const ret = wasm.breakEvenUnits(fixed_costs, price_per_unit, variable_cost_per_unit);
    return ret === 0 ? undefined : BreakEvenResult.__wrap(ret);
}

/**
 * Cost-plus pricing: materials + labor + overhead, then margin applied on
 * PRICE (`price = cost / (1 - m)`), not the classic x1.5 markup guess.
 * Returns `None` (JS `null`) for negative/NaN inputs or an impossible margin.
 * @param {number} materials
 * @param {number} labor_hours
 * @param {number} hourly_rate
 * @param {number} overhead_pct
 * @param {number} margin_pct
 * @returns {CostPlusResult | undefined}
 */
export function computeCostPlus(materials, labor_hours, hourly_rate, overhead_pct, margin_pct) {
    const ret = wasm.computeCostPlus(materials, labor_hours, hourly_rate, overhead_pct, margin_pct);
    return ret === 0 ? undefined : CostPlusResult.__wrap(ret);
}

/**
 * Value-based pricing from competitor anchor prices + differentiation multiplier.
 * Anchors are filtered to finite positive values and sorted; the reference is
 * `median * multiplier`, with the multiplier clamped to [0.1, 10].
 * @param {Float64Array} anchors
 * @param {number} multiplier
 * @returns {ValueBasedResult | undefined}
 */
export function computeValueBased(anchors, multiplier) {
    const ptr0 = passArrayF64ToWasm0(anchors, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.computeValueBased(ptr0, len0, multiplier);
    return ret === 0 ? undefined : ValueBasedResult.__wrap(ret);
}

/**
 * Markup (%) -> margin (%): m = mu / (1 + mu).
 * @param {number} markup_pct
 * @returns {number | undefined}
 */
export function marginFromMarkup(markup_pct) {
    const ret = wasm.marginFromMarkup(markup_pct);
    return ret[0] === 0 ? undefined : ret[1];
}

/**
 * Margin (%) -> markup (%): mu = m / (1 - m).
 * @param {number} margin_pct
 * @returns {number | undefined}
 */
export function markupFromMargin(margin_pct) {
    const ret = wasm.markupFromMargin(margin_pct);
    return ret[0] === 0 ? undefined : ret[1];
}

/**
 * Psychological price endings.
 * `mode = "charm"`: largest price ending in .90/.95/.99 strictly below `price`.
 * `mode = "round"`: next clean integer (identity when already integral).
 * @param {number} price
 * @param {string} mode
 * @returns {number | undefined}
 */
export function psychological(price, mode) {
    const ptr0 = passStringToWasm0(mode, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.psychological(price, ptr0, len0);
    return ret[0] === 0 ? undefined : ret[1];
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_bb96b2010945f0bc: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./pricecraft_engine_bg.js": import0,
    };
}

const BreakEvenResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_breakevenresult_free(ptr, 1));
const CostPlusResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_costplusresult_free(ptr, 1));
const ValueBasedResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_valuebasedresult_free(ptr, 1));

let cachedFloat64ArrayMemory0 = null;
function getFloat64ArrayMemory0() {
    if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
        cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArrayF64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getFloat64ArrayMemory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat64ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('pricecraft_engine_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
