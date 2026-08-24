//! Known-answer tests mirroring tests/core.test.js v1 — identical vectors.

use pricecraft_engine::*;

macro_rules! approx {
    ($a:expr, $b:expr) => {
        assert!(($a - $b).abs() < 1e-9, "left={} right={}", $a, $b);
    };
}

#[test]
fn cost_plus_composes_correctly() {
    // 10 mat + (2h x 25) = 60 production; +20% overhead = 72; margin 50% -> 144
    let r = compute_cost_plus(10.0, 2.0, 25.0, 20.0, 50.0).expect("valid");
    assert_eq!(r.production_cost(), 60.0);
    assert_eq!(r.overhead(), 12.0);
    assert_eq!(r.total_cost(), 72.0);
    assert_eq!(r.suggested_price(), 144.0); // 72 / (1-0.5)
    assert_eq!(r.profit(), 72.0);
}

#[test]
fn cost_plus_zero_overhead_margin_is_cost_recovery() {
    let r = compute_cost_plus(40.0, 1.0, 20.0, 0.0, 0.0).expect("valid");
    assert_eq!(r.suggested_price(), 60.0);
    assert_eq!(r.profit(), 0.0);
}

#[test]
fn cost_plus_rejects_negative_and_nan() {
    assert!(compute_cost_plus(-1.0, 2.0, 25.0, 0.0, 0.0).is_none());
    assert!(compute_cost_plus(f64::NAN, 2.0, 25.0, 0.0, 0.0).is_none());
}

#[test]
fn cost_plus_margin_100_is_impossible() {
    assert!(compute_cost_plus(10.0, 0.0, 0.0, 0.0, 100.0).is_none());
}

#[test]
fn cost_plus_profit_equals_price_minus_total_cost() {
    let r = compute_cost_plus(7.3, 1.5, 18.0, 12.0, 35.0).expect("valid");
    approx!(r.suggested_price() - r.total_cost(), r.profit());
}

#[test]
fn value_based_even_median_is_mean_of_middle_two() {
    let r = compute_value_based(vec![30.0, 10.0, 20.0, 40.0], 1.0).expect("valid");
    assert_eq!(r.median(), 25.0);
    assert_eq!(r.min(), 10.0);
    assert_eq!(r.max(), 40.0);
    assert_eq!(r.reference_price(), 25.0);
}

#[test]
fn value_based_multiplier_scales_median() {
    let r = compute_value_based(vec![20.0, 30.0, 40.0], 1.5).expect("valid");
    assert_eq!(r.median(), 30.0);
    assert_eq!(r.reference_price(), 45.0);
}

#[test]
fn value_based_empty_or_bad_multiplier_is_none() {
    assert!(compute_value_based(vec![], 2.0).is_none());
    assert!(compute_value_based(vec![10.0, 20.0], 0.0).is_none());
    assert!(compute_value_based(vec![10.0, 20.0], f64::INFINITY).is_none());
}

#[test]
fn charm_ending_never_exceeds_price() {
    assert_eq!(psychological(48.62, "charm"), Some(47.99));
    assert_eq!(psychological(49.05, "charm"), Some(48.99));
    assert_eq!(psychological(0.5, "charm"), None); // no charm price fits below 0.5
}

#[test]
fn round_mode_rounds_up_to_next_integer() {
    assert_eq!(psychological(48.2, "round"), Some(49.0));
    assert_eq!(psychological(49.0, "round"), Some(49.0));
}

#[test]
fn psychological_rejects_negatives_and_unknown_modes() {
    assert_eq!(psychological(-5.0, "round"), None);
    assert_eq!(psychological(10.0, "bogus"), None);
}

#[test]
fn margin_50_equals_markup_100() {
    assert_eq!(markup_from_margin(50.0), Some(100.0));
    assert_eq!(margin_from_markup(100.0), Some(50.0));
}

#[test]
fn margin_markup_round_trip() {
    for m in [10.0, 25.0, 33.33, 75.0] {
        let back = margin_from_markup(markup_from_margin(m).unwrap()).unwrap();
        assert!((back - m).abs() < 0.01, "round-trip failed for {m}");
    }
}

#[test]
fn break_even_ceil_units_cover_fixed_costs() {
    // contribution 15 -> 1500/15 = 100 units
    let r = break_even_units(1500.0, 45.0, 30.0).expect("valid");
    assert_eq!(r.units(), Some(100));
    assert_eq!(r.revenue(), Some(4500.0));
}

#[test]
fn break_even_partial_unit_rounds_up() {
    assert_eq!(
        break_even_units(100.0, 30.0, 10.0).expect("valid").units(),
        Some(5)
    );
    assert_eq!(
        break_even_units(101.0, 30.0, 10.0).expect("valid").units(),
        Some(6)
    );
}

#[test]
fn break_even_price_below_variable_never_breaks_even() {
    let r = break_even_units(500.0, 10.0, 12.0).expect("valid");
    assert_eq!(r.units(), None);
}
