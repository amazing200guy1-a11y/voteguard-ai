# VoteGuard AI 🛡️

**BVAS Tally Reconciliation Engine for Nigerian Electoral Integrity**

> AI-powered fraud detection that cross-checks BVAS biometric accreditation data against Form EC8A results — catching overvoting, result reversals, impossible turnout, and 6 other electoral fraud signals in real time.

Built for the **#AI4Elections Nigeria 2026** Hackathon — Track 4: Electoral Cybersecurity & Resilience.

---

## 🎯 The Problem

Nigeria's BVAS + IReV system creates a transparent paper trail — but manual collation at LGA level still allows results to be manipulated between the polling unit and the official declaration. Fraud leaves a mathematical fingerprint that humans miss but AI catches instantly.

**The Golden Rule (Electoral Act 2022, S.51):**
> Total votes on Form EC8A **cannot exceed** BVAS-accredited voters. Any violation = grounds for cancellation.

---

## 🔍 8 Fraud Detectors

| Detector | Severity | Description |
|---|---|---|
| `OVERVOTING` | 🔴 CRITICAL | Votes cast > BVAS accreditations |
| `IMPOSSIBLE_TURNOUT` | 🔴 CRITICAL | Votes cast > registered voters |
| `RESULT_REVERSAL` | 🔴 CRITICAL | PU total ≠ LGA collation record |
| `MISSING_IREV_UPLOAD` | 🟠 HIGH | No Form EC8A image on IReV portal |
| `SINGLE_PARTY_SWEEP` | 🟠 HIGH | One party receives ≥98% of votes |
| `ACCREDITATION_GAP` | 🟠 HIGH | BVAS count vs EC8A declared differ >5% |
| `ZERO_OPPOSITION` | 🟠 HIGH | All other parties scored 0 votes |
| `SUSPICIOUS_ROUND` | 🟡 MEDIUM | All tallies are multiples of 5 (fabrication pattern) |

---

## 📊 Risk Scoring

| Score | Tier | Meaning |
|---|---|---|
| 0–20 | ✅ CLEAN | No anomalies detected |
| 21–45 | 👁️ WATCH | Minor irregularities, monitor |
| 46–69 | ⚠️ SUSPECT | Significant anomalies, investigate |
| 70–100 | 🚨 CRITICAL | High-confidence fraud signal |

---

## 🚀 Quick Start

```bash
# Run the test suite (24 deterministic tests)
node test/voteguard.test.js

# Start the API server + dashboard
node src/server.js
# → Open http://localhost:3000
```

---

## 🏗️ Architecture

```
voteguard-ai/
├── src/
│   ├── reconciler.js    ← Core fraud detection engine (8 detectors)
│   └── server.js        ← HTTP API server
├── data/
│   └── seed_polling_units.js  ← 10 realistic PUs (clean + fraud scenarios)
├── test/
│   └── voteguard.test.js      ← 24 deterministic tests (all pass)
└── dashboard.html       ← Live titanium cockpit dashboard
```

---

## 📡 API

```
GET /api/audit   → Full reconciliation report for all polling units
GET /api/health  → Health check
```

---

## 🔗 Links

- **Live Dashboard**: https://amazing200guy1-a11y.github.io/voteguard-ai/
- **GitHub**: https://github.com/amazing200guy1-a11y/voteguard-ai
- **Hackathon**: #AI4Elections Nigeria 2026 | Rise Networks + INEC
- **Author**: Usman Bamidele

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (zero dependencies)
- **Engine**: Deterministic rule-based + statistical anomaly detection
- **Dashboard**: Pure HTML/CSS/JS (no framework)
- **Tests**: 24 passing, 0 failing

---

*"Free and fair elections are the bedrock of democracy. VoteGuard AI makes sure the numbers don't lie."*
