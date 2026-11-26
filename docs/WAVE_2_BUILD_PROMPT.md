# 🧠 Prithvi Grid — Agent Build Prompt: Wave 2 (Smart Node & Pit Intelligence)
**Document Classification:** Agent Implementation Specification | **Target:** Wave 2 (Features 1, 3, 8 & Feature 2 server-side)  
**System Base:** Prithvi Grid v2.0 Enterprise SaaS & Smart Spear Telemetry Architecture  
**Hardware Strategy:** Server-Side Simulation First + ESP32 Downlink Payload Contract  
**Primary Vertical Focus:** Commercial Hospitality & Hotels (Hot kitchen oily waste, fast thermal rebound, odor mitigation)  
**AI Provider Rule:** Google Gemini Only (perception, draft extraction, narrative phrasing; 0% autonomous decision authority)  

---

## 1. Executive Summary & Objective

Wave 2 turns the battery-less Smart Spear probe and the physical compost pit into adaptive, personalized biological assets:
1. **Feature 1 (Harvest-Aware Wake Scheduler / Wake Appointments):** Cloud energy model for the LTC3108 TEG harvester and dual 25F supercapacitor bank ($C_{\text{eff}} = 12.5\text{F}$); priority knapsack scheduling allocating budget to worker roster task appointments ($t-5$, $t+5$, $t+15$, $t+30$), risk appointments (methane slope), housekeeping, and heartbeats; compact downlink piggybacked in `HTTP 202 Accepted` response; $V_{\text{supercap}} < 4.0\text{V}$ brownout interlock.
2. **Feature 3 (Pit Personality Profiles):** Bayesian partial pooling ($w = \frac{N}{N + 5}$) learning pit-specific empirical response coefficients (`tempReboundHours`, `methaneDecayHalfLifeHours`, `moistureGainPerLiterWater`, `dailyHeatingRateC`, `thermalInertiaCoeff`, `odorLagHours`); hotel kitchen archetype priors; statistical drift detection when pile dynamics diverge by $> 2.5\sigma$.
3. **Feature 8 (Pit Health Index with Explain-and-Fix):** Decomposable 0–100 index across 6 sub-scores (Thermal, Moisture, Acidity, Aeration, Progress, Data Trust); Safeguard A (critical alert caps score at $\le 49$); Safeguard B (insufficient coverage flag); Explain-and-Fix engine deriving highest-impact next-best action with expected delta calculated from pit personality coefficients; facility league table displaying the worst pit right beside the facility average.
4. **Feature 2 (BLE Proximity Proof Server Architecture):** Cryptographic challenge-response handshake (`nonce` + worker phone hash + readings snapshot + HMAC-SHA256 signature) proving physical worker presence at the pit with anti-replay guarantees.

---

## 2. API Endpoints Created in Wave 2

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/fleet/scheduler/:nodeId` | JWT | Node energy calendar, appointments, and brownout risk |
| `POST` | `/api/v1/fleet/scheduler/generate` | JWT | Generates dynamic harvest-aware wake appointments based on roster |
| `GET` | `/api/v1/pit-monitor/personality/:pitId` | JWT | Retrieves learned pit personality fingerprint and response coefficients |
| `GET` | `/api/v1/pit-monitor/health-index/:pitId` | JWT | Live & 30-day Pit Health Index with Explain-and-Fix action |
| `GET` | `/api/v1/pit-monitor/facility-health-league/:facilityId` | JWT | Facility load-weighted average with worst pit prominently displayed |
| `GET` | `/api/v1/verification/proximity-challenge` | JWT | Generates 128-bit random challenge nonce for BLE handshake |
| `POST` | `/api/v1/verification/proximity-proof` | JWT | Verifies signed BLE proximity proof with anti-replay protection |

---

## 3. Test Suite Verification

- **Wave 2 Test Suite:** [`phase-9-wave-2-pit-intelligence.test.ts`](file:///c:/Users/aa/Documents/prithvi_grid_development/packages/api/test/phase-9-wave-2-pit-intelligence.test.ts)
  - 11 of 11 tests passing.
- **Full System Regression:**
  - 97 of 97 tests passing across 40 test suites.
  - Zero TypeScript errors (`tsc --noEmit` code 0).
