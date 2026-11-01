/**
 * VoteGuard AI — Test Suite
 * =========================
 * Validates all 8 fraud detectors in the reconciliation engine.
 */

'use strict';

const { reconcilePollingUnit, reconcileElection } = require('../src/reconciler');
const { SEED_POLLING_UNITS } = require('../data/seed_polling_units');

let passed = 0;
let failed = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  PASS  ${testName}`);
    passed++;
  } else {
    console.error(`  FAIL  ${testName}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

console.log('\n================================================');
console.log('  VoteGuard AI — Reconciliation Engine Tests');
console.log('================================================\n');

// ── Test 1: Clean unit scores LOW risk ──────────────────────────────────────
console.log('[ Clean Unit ]');
const cleanPU = SEED_POLLING_UNITS[0];
const cleanResult = reconcilePollingUnit(cleanPU);
assert(cleanResult.risk_score <= 20,    'Clean unit risk score <= 20', `got ${cleanResult.risk_score}`);
assert(cleanResult.risk_tier === 'CLEAN', 'Clean unit tier = CLEAN');
assert(cleanResult.flags.length === 0,  'Clean unit has 0 flags');
console.log();

// ── Test 2: Overvoting flag ──────────────────────────────────────────────────
console.log('[ Overvoting ]');
const overvotePU = SEED_POLLING_UNITS[3]; // 760 votes vs 520 BVAS
const overvoteResult = reconcilePollingUnit(overvotePU);
assert(overvoteResult.flags.some(f => f.code === 'OVERVOTING'), 'OVERVOTING flag raised');
assert(overvoteResult.risk_score >= 40,   'Overvoting risk score >= 40', `got ${overvoteResult.risk_score}`);
assert(overvoteResult.risk_tier === 'CRITICAL' || overvoteResult.risk_tier === 'SUSPECT',
  'Overvoting tier = CRITICAL or SUSPECT');
console.log();

// ── Test 3: Impossible turnout flag ─────────────────────────────────────────
console.log('[ Impossible Turnout ]');
const impossiblePU = SEED_POLLING_UNITS[4]; // 920 votes > 800 registered
const impossibleResult = reconcilePollingUnit(impossiblePU);
assert(impossibleResult.flags.some(f => f.code === 'IMPOSSIBLE_TURNOUT'), 'IMPOSSIBLE_TURNOUT flag raised');
assert(impossibleResult.flags.some(f => f.code === 'MISSING_IREV_UPLOAD'), 'MISSING_IREV_UPLOAD flag raised too');
assert(impossibleResult.risk_score >= 50, 'Compound fraud score >= 50', `got ${impossibleResult.risk_score}`);
console.log();

// ── Test 4: Single-party sweep flag ─────────────────────────────────────────
console.log('[ Single-Party Sweep ]');
const sweepPU = SEED_POLLING_UNITS[5]; // APC 99%
const sweepResult = reconcilePollingUnit(sweepPU);
assert(sweepResult.flags.some(f => f.code === 'SINGLE_PARTY_SWEEP'), 'SINGLE_PARTY_SWEEP flag raised');
console.log();

// ── Test 5: Result reversal flag ─────────────────────────────────────────────
console.log('[ Result Reversal ]');
const reversalPU = SEED_POLLING_UNITS[6]; // PU=612, collation=780
const reversalResult = reconcilePollingUnit(reversalPU);
assert(reversalResult.flags.some(f => f.code === 'RESULT_REVERSAL'), 'RESULT_REVERSAL flag raised');
assert(reversalResult.risk_score >= 30, 'Reversal risk score >= 30', `got ${reversalResult.risk_score}`);
console.log();

// ── Test 6: Suspicious round numbers ────────────────────────────────────────
console.log('[ Suspicious Round Numbers ]');
const roundPU = SEED_POLLING_UNITS[7]; // APC:300, PDP:150, LP:50 — all divisible by 5
const roundResult = reconcilePollingUnit(roundPU);
assert(roundResult.flags.some(f => f.code === 'SUSPICIOUS_ROUND'), 'SUSPICIOUS_ROUND flag raised');
console.log();

// ── Test 7: Missing IReV upload ──────────────────────────────────────────────
console.log('[ Missing IReV Upload ]');
const irevPU = SEED_POLLING_UNITS[8]; // irev_uploaded: false
const irevResult = reconcilePollingUnit(irevPU);
assert(irevResult.flags.some(f => f.code === 'MISSING_IREV_UPLOAD'), 'MISSING_IREV_UPLOAD flag raised');
console.log();

// ── Test 8: Compound fraud — maximum flags ───────────────────────────────────
console.log('[ Compound Fraud — Maximum Flags ]');
const worstPU = SEED_POLLING_UNITS[9]; // Rivers: overvoting + sweep + zero opp + missing IReV + reversal + gap
const worstResult = reconcilePollingUnit(worstPU);
assert(worstResult.risk_score === 100,   'Compound fraud capped at 100', `got ${worstResult.risk_score}`);
assert(worstResult.risk_tier === 'CRITICAL', 'Compound fraud tier = CRITICAL');
assert(worstResult.flags.length >= 5,   'Compound fraud has 5+ flags', `got ${worstResult.flags.length}`);
console.log();

// ── Test 9: Batch reconciliation ─────────────────────────────────────────────
console.log('[ Batch Reconciliation ]');
const report = reconcileElection(SEED_POLLING_UNITS);
assert(report.total_units === SEED_POLLING_UNITS.length, 'All PUs processed');
assert(report.tiers.CRITICAL >= 1,  'At least 1 CRITICAL unit detected');
assert(report.tiers.CLEAN >= 1,     'At least 1 CLEAN unit present');
assert(report.top_flags.length > 0, 'Top flags aggregated');
assert(typeof report.flag_rate === 'string', 'Flag rate calculated');
assert(Object.keys(report.by_state).length > 0, 'State-level rollup generated');
console.log();

// ── Test 10: Accreditation gap flag ──────────────────────────────────────────
console.log('[ Accreditation Gap ]');
const gapPU = {
  pu_code: 'TEST/GAP/001', pu_name: 'Test Gap Unit',
  state: 'Lagos', lga: 'Ikeja', ward: 'Ikeja Central',
  registered_voters: 1000,
  bvas_accredited: 500,
  declared_accredited: 600,   // 20% gap vs BVAS
  party_votes: { APC: 300, PDP: 200 },
  irev_uploaded: true,
  collation_total: 500,
};
const gapResult = reconcilePollingUnit(gapPU);
assert(gapResult.flags.some(f => f.code === 'ACCREDITATION_GAP'), 'ACCREDITATION_GAP flag raised');
console.log();

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('================================================');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('================================================\n');

if (failed > 0) {
  console.error(`  ${failed} test(s) failed.`);
  process.exit(1);
} else {
  console.log('  All tests passed. VoteGuard AI engine is verified.\n');
  process.exit(0);
}
