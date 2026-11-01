/**
 * Seed data — realistic Nigerian polling units for VoteGuard AI demo
 * Includes clean units and deliberately flagged fraud scenarios.
 */

'use strict';

const SEED_POLLING_UNITS = [
  // ── CLEAN UNITS ──────────────────────────────────────────────────────────
  {
    pu_code: '36/13/01/001',
    pu_name: 'KUJE AREA COUNCIL PRIMARY SCHOOL I',
    state: 'FCT Abuja', lga: 'Kuje', ward: 'Kuje Central',
    registered_voters: 892,
    bvas_accredited: 410,
    declared_accredited: 410,
    party_votes: { APC: 189, PDP: 156, LP: 52, NNPP: 8, YPP: 5 },
    irev_uploaded: true,
    collation_total: 410,
  },
  {
    pu_code: '08/05/03/011',
    pu_name: 'ST AUGUSTINE PRIMARY SCHOOL',
    state: 'Anambra', lga: 'Awka South', ward: 'Amawbia',
    registered_voters: 1204,
    bvas_accredited: 678,
    declared_accredited: 678,
    party_votes: { APGA: 401, LP: 187, PDP: 67, APC: 23 },
    irev_uploaded: true,
    collation_total: 678,
  },
  {
    pu_code: '17/08/02/007',
    pu_name: 'NASSARAWA TOTO TOWN HALL',
    state: 'Nasarawa', lga: 'Toto', ward: 'Gadabuke',
    registered_voters: 543,
    bvas_accredited: 301,
    declared_accredited: 299,
    party_votes: { APC: 172, PDP: 98, LP: 28, NNPP: 3 },
    irev_uploaded: true,
    collation_total: 301,
  },

  // ── OVERVOTING (votes > BVAS accredited) ─────────────────────────────────
  {
    pu_code: '25/04/09/022',
    pu_name: 'GARKI MODEL PRIMARY SCHOOL',
    state: 'FCT Abuja', lga: 'Abuja Municipal', ward: 'Garki',
    registered_voters: 1100,
    bvas_accredited: 520,
    declared_accredited: 520,
    party_votes: { APC: 400, PDP: 210, LP: 100, NNPP: 50 },  // total=760 > 520 BVAS
    irev_uploaded: true,
    collation_total: 760,
  },

  // ── IMPOSSIBLE TURNOUT (votes > registered voters) ────────────────────────
  {
    pu_code: '31/11/06/004',
    pu_name: 'ODUDUWA COMMUNITY SCHOOL',
    state: 'Osun', lga: 'Ife Central', ward: 'Ilare',
    registered_voters: 800,
    bvas_accredited: 850,    // BVAS > registered — also suspicious
    declared_accredited: 850,
    party_votes: { APC: 500, PDP: 300, LP: 100, NNPP: 20 }, // total=920 > 800 registered
    irev_uploaded: false,    // also missing IReV upload
    collation_total: 920,
  },

  // ── SINGLE-PARTY SWEEP (99% to one party) ────────────────────────────────
  {
    pu_code: '12/02/01/033',
    pu_name: 'FAGGE WARD C COMMUNITY CENTRE',
    state: 'Kano', lga: 'Fagge', ward: 'Fagge C',
    registered_voters: 2100,
    bvas_accredited: 1800,
    declared_accredited: 1800,
    party_votes: { APC: 1782, PDP: 12, LP: 4, NNPP: 2 },   // APC=99.0%
    irev_uploaded: true,
    collation_total: 1800,
  },

  // ── RESULT REVERSAL (PU total vs LGA collation mismatch) ─────────────────
  {
    pu_code: '07/06/04/018',
    pu_name: 'DELTA STATE UNIVERSITY CLINIC PU',
    state: 'Delta', lga: 'Oshimili North', ward: 'Akwukwu-Igbo',
    registered_voters: 950,
    bvas_accredited: 612,
    declared_accredited: 612,
    party_votes: { PDP: 312, APC: 198, LP: 87, APGA: 15 },  // total=612
    irev_uploaded: true,
    collation_total: 780,   // collation says 780 — RESULT REVERSAL flagged
  },

  // ── SUSPICIOUS ROUND NUMBERS ──────────────────────────────────────────────
  {
    pu_code: '20/09/03/041',
    pu_name: 'ILORIN EAST PRIMARY SCHOOL II',
    state: 'Kwara', lga: 'Ilorin East', ward: 'Budo-Egba',
    registered_voters: 750,
    bvas_accredited: 500,
    declared_accredited: 500,
    party_votes: { APC: 300, PDP: 150, LP: 50 },  // all round numbers
    irev_uploaded: true,
    collation_total: 500,
  },

  // ── MISSING IREV UPLOAD ───────────────────────────────────────────────────
  {
    pu_code: '05/03/07/009',
    pu_name: 'CROSS RIVER COMM HEALTH CENTRE',
    state: 'Cross River', lga: 'Abi', ward: 'Usumutong',
    registered_voters: 680,
    bvas_accredited: 389,
    declared_accredited: 389,
    party_votes: { PDP: 220, APC: 140, LP: 29 },
    irev_uploaded: false,   // IReV not uploaded
    collation_total: 389,
  },

  // ── MULTIPLE FLAGS (worst-case compound fraud) ────────────────────────────
  {
    pu_code: '22/07/02/055',
    pu_name: 'RIVERS STATE GOVT SCHOOL C',
    state: 'Rivers', lga: 'Port Harcourt', ward: 'D-Line',
    registered_voters: 1000,
    bvas_accredited: 600,
    declared_accredited: 720,  // 120-voter gap vs BVAS
    party_votes: { PDP: 900, APC: 5, LP: 0, NNPP: 0 },   // overvoting + sweep + zero opp
    irev_uploaded: false,
    collation_total: 950,      // result reversal on top
  },
];

module.exports = { SEED_POLLING_UNITS };
