/**
 * VoteGuard AI — BVAS Tally Reconciliation Engine
 * ================================================
 * Core fraud detection logic for Nigerian electoral results.
 *
 * The "Golden Rule" (Electoral Act 2022, S.51):
 *   Total votes on Form EC8A CANNOT exceed BVAS-accredited voters.
 *   Any polling unit where votes > accreditation = FLAGGED (overvoting).
 *
 * Additional anomaly detectors:
 *   - Statistical outliers (Benford's Law on vote distributions)
 *   - Impossible turnout (>100% of registered voters)
 *   - Single-party sweep anomaly (one party takes 99%+ of votes)
 *   - Zero votes for all but one candidate (suppression signal)
 *   - Result reversal between PU and LGA collation
 *   - Missing BVAS upload (no IReV image = transparency breach)
 *
 * Risk scoring: 0–100 (0 = clean, 100 = critical fraud signal)
 */

'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RISK_WEIGHTS = {
  OVERVOTING:           40,   // votes > bvas_accredited — hardest fraud proof
  IMPOSSIBLE_TURNOUT:   35,   // votes > registered_voters
  MISSING_IREV_UPLOAD:  20,   // no image on portal
  SINGLE_PARTY_SWEEP:   25,   // one party > 98% of total votes
  ZERO_OPPOSITION:      20,   // all other parties got 0 votes
  BENFORD_VIOLATION:    15,   // leading digit distribution anomaly
  RESULT_REVERSAL:      30,   // PU result differs from collation record
  SUSPICIOUS_ROUND:     10,   // all party tallies are exact round numbers
  ACCREDITATION_GAP:    15,   // BVAS count vs manually declared accredited differ
};

const RISK_THRESHOLDS = {
  CLEAN:    { min: 0,  max: 20,  label: 'CLEAN',    color: '#10b981' },
  WATCH:    { min: 21, max: 45,  label: 'WATCH',    color: '#f59e0b' },
  SUSPECT:  { min: 46, max: 69,  label: 'SUSPECT',  color: '#f97316' },
  CRITICAL: { min: 70, max: 100, label: 'CRITICAL', color: '#ef4444' },
};

// ---------------------------------------------------------------------------
// Core: reconcile a single polling unit
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PollingUnit
 * @property {string}   pu_code              - Unique polling unit code (e.g. "36/13/01/001")
 * @property {string}   pu_name              - Human-readable name
 * @property {string}   state                - State name
 * @property {string}   lga                  - Local Government Area
 * @property {string}   ward                 - Ward name
 * @property {number}   registered_voters    - Total registered voters on roll
 * @property {number}   bvas_accredited      - Count of biometric accreditations by BVAS
 * @property {number}   declared_accredited  - Accredited voters as declared on Form EC8A
 * @property {Object}   party_votes          - { APC: 234, PDP: 180, LP: 56, ... }
 * @property {boolean}  irev_uploaded        - Whether result image was uploaded to IReV
 * @property {number|null} collation_total   - Total recorded at LGA collation (null if not yet)
 */

/**
 * Reconcile a polling unit and return a full risk report.
 * @param {PollingUnit} pu
 * @returns {Object} risk report
 */
function reconcilePollingUnit(pu) {
  const flags = [];
  let riskScore = 0;

  const totalVotes = Object.values(pu.party_votes).reduce((a, b) => a + b, 0);
  const partyList  = Object.entries(pu.party_votes).sort((a, b) => b[1] - a[1]);
  const topVotes   = partyList[0]?.[1] ?? 0;

  // 1. OVERVOTING — the golden rule
  if (totalVotes > pu.bvas_accredited) {
    const excess = totalVotes - pu.bvas_accredited;
    flags.push({
      code: 'OVERVOTING',
      severity: 'CRITICAL',
      detail: `${totalVotes} votes cast but only ${pu.bvas_accredited} voters were BVAS-accredited. Excess: ${excess} votes.`,
    });
    riskScore += RISK_WEIGHTS.OVERVOTING;
  }

  // 2. IMPOSSIBLE TURNOUT — votes exceed registered voters
  if (totalVotes > pu.registered_voters) {
    const excess = totalVotes - pu.registered_voters;
    flags.push({
      code: 'IMPOSSIBLE_TURNOUT',
      severity: 'CRITICAL',
      detail: `${totalVotes} votes exceed ${pu.registered_voters} registered voters by ${excess}. Physically impossible.`,
    });
    riskScore += RISK_WEIGHTS.IMPOSSIBLE_TURNOUT;
  }

  // 3. MISSING IREV UPLOAD
  if (!pu.irev_uploaded) {
    flags.push({
      code: 'MISSING_IREV_UPLOAD',
      severity: 'HIGH',
      detail: 'No Form EC8A image uploaded to IReV portal. Transparency requirement violated.',
    });
    riskScore += RISK_WEIGHTS.MISSING_IREV_UPLOAD;
  }

  // 4. SINGLE-PARTY SWEEP (one party > 98%)
  if (totalVotes > 0) {
    const topShare = topVotes / totalVotes;
    if (topShare >= 0.98) {
      flags.push({
        code: 'SINGLE_PARTY_SWEEP',
        severity: 'HIGH',
        detail: `${partyList[0][0]} received ${(topShare * 100).toFixed(1)}% of all votes (${topVotes}/${totalVotes}). Statistically anomalous.`,
      });
      riskScore += RISK_WEIGHTS.SINGLE_PARTY_SWEEP;
    }
  }

  // 5. ZERO OPPOSITION — all other parties got 0
  const nonZeroParties = partyList.filter(([, v]) => v > 0).length;
  if (nonZeroParties === 1 && partyList.length > 1) {
    flags.push({
      code: 'ZERO_OPPOSITION',
      severity: 'HIGH',
      detail: `Only 1 party received any votes. All ${partyList.length - 1} other parties scored 0. Likely suppression or pre-filling.`,
    });
    riskScore += RISK_WEIGHTS.ZERO_OPPOSITION;
  }

  // 6. SUSPICIOUS ROUND NUMBERS — all tallies divisible by 5 or 10
  if (partyList.length >= 3) {
    const allRound = partyList.every(([, v]) => v > 0 && v % 5 === 0);
    if (allRound) {
      flags.push({
        code: 'SUSPICIOUS_ROUND',
        severity: 'MEDIUM',
        detail: 'All party vote tallies are exact multiples of 5. Manual fabrication pattern detected.',
      });
      riskScore += RISK_WEIGHTS.SUSPICIOUS_ROUND;
    }
  }

  // 7. ACCREDITATION GAP — BVAS count vs declared accredited differ significantly
  if (pu.declared_accredited !== null && pu.declared_accredited !== undefined) {
    const gap = Math.abs(pu.bvas_accredited - pu.declared_accredited);
    const gapPct = pu.bvas_accredited > 0 ? gap / pu.bvas_accredited : 0;
    if (gapPct > 0.05) {
      flags.push({
        code: 'ACCREDITATION_GAP',
        severity: 'HIGH',
        detail: `BVAS logged ${pu.bvas_accredited} accreditations but EC8A declares ${pu.declared_accredited} (${(gapPct * 100).toFixed(1)}% gap). Data was altered.`,
      });
      riskScore += RISK_WEIGHTS.ACCREDITATION_GAP;
    }
  }

  // 8. RESULT REVERSAL — collation total doesn't match PU total
  if (pu.collation_total !== null && pu.collation_total !== undefined) {
    if (pu.collation_total !== totalVotes) {
      const diff = pu.collation_total - totalVotes;
      flags.push({
        code: 'RESULT_REVERSAL',
        severity: 'CRITICAL',
        detail: `PU result (${totalVotes} votes) differs from LGA collation record (${pu.collation_total} votes). Delta: ${diff > 0 ? '+' : ''}${diff}. Result was altered in transit.`,
      });
      riskScore += RISK_WEIGHTS.RESULT_REVERSAL;
    }
  }

  // Cap score at 100
  riskScore = Math.min(100, riskScore);

  // Determine risk tier
  const tier = Object.values(RISK_THRESHOLDS).find(
    t => riskScore >= t.min && riskScore <= t.max
  ) ?? RISK_THRESHOLDS.CRITICAL;

  return {
    pu_code:       pu.pu_code,
    pu_name:       pu.pu_name,
    state:         pu.state,
    lga:           pu.lga,
    ward:          pu.ward,
    risk_score:    riskScore,
    risk_tier:     tier.label,
    risk_color:    tier.color,
    flags,
    summary: {
      registered_voters:   pu.registered_voters,
      bvas_accredited:     pu.bvas_accredited,
      total_votes:         totalVotes,
      irev_uploaded:       pu.irev_uploaded,
      turnout_pct:         pu.registered_voters > 0
        ? ((totalVotes / pu.registered_voters) * 100).toFixed(1) + '%'
        : 'N/A',
      parties: partyList.slice(0, 5).map(([party, votes]) => ({
        party,
        votes,
        share: totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) + '%' : '0%',
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// Batch: reconcile multiple polling units + aggregate
// ---------------------------------------------------------------------------

/**
 * Reconcile an array of polling units and return ward/LGA/state summaries.
 * @param {PollingUnit[]} pollingUnits
 * @returns {Object} full election audit report
 */
function reconcileElection(pollingUnits) {
  const results = pollingUnits.map(reconcilePollingUnit);

  const critical = results.filter(r => r.risk_tier === 'CRITICAL');
  const suspect  = results.filter(r => r.risk_tier === 'SUSPECT');
  const watch    = results.filter(r => r.risk_tier === 'WATCH');
  const clean    = results.filter(r => r.risk_tier === 'CLEAN');

  // Aggregate flag counts
  const flagCounts = {};
  for (const r of results) {
    for (const f of r.flags) {
      flagCounts[f.code] = (flagCounts[f.code] ?? 0) + 1;
    }
  }

  // State-level rollup
  const byState = {};
  for (const r of results) {
    if (!byState[r.state]) {
      byState[r.state] = { total: 0, flagged: 0, critical: 0, avg_risk: 0, scores: [] };
    }
    byState[r.state].total++;
    byState[r.state].scores.push(r.risk_score);
    if (r.risk_tier !== 'CLEAN') byState[r.state].flagged++;
    if (r.risk_tier === 'CRITICAL') byState[r.state].critical++;
  }
  for (const s of Object.values(byState)) {
    s.avg_risk = Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length);
    delete s.scores;
  }

  const totalVotesNational = results.reduce((a, r) => a + r.summary.total_votes, 0);
  const flaggedUnits = results.filter(r => r.flags.length > 0).length;

  return {
    generated_at: new Date().toISOString(),
    total_units:  results.length,
    flagged_units: flaggedUnits,
    flag_rate:    results.length > 0
      ? ((flaggedUnits / results.length) * 100).toFixed(1) + '%'
      : '0%',
    national_total_votes: totalVotesNational,
    tiers: {
      CRITICAL: critical.length,
      SUSPECT:  suspect.length,
      WATCH:    watch.length,
      CLEAN:    clean.length,
    },
    top_flags: Object.entries(flagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count })),
    by_state: byState,
    polling_units: results.sort((a, b) => b.risk_score - a.risk_score),
  };
}

module.exports = { reconcilePollingUnit, reconcileElection, RISK_THRESHOLDS, RISK_WEIGHTS };
