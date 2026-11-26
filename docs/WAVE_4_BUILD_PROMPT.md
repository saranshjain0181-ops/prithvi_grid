# 🏨 Prithvi Grid — Agent Build Prompt: Wave 4 (Hospitality & Healthcare Depth)
**Document Classification:** Agent Implementation Specification | **Target:** Wave 4 (Features 7, 12, 13, 20, 21)  
**System Base:** Prithvi Grid v2.0 Enterprise SaaS & Smart Spear Telemetry Architecture  
**Primary Vertical Focus:** Commercial Hotels, Large Banquets & Healthcare Facilities  
**AI Provider Rule:** Google Gemini Only (perception, draft extraction, narrative drafting; 0% autonomous decision authority)  

---

## 1. Executive Summary & Features Implemented

1. **Feature 12 (Bulking Material Inventory & Reorder Autopilot):**
   - Tracks stock of sawdust, dry leaves, cocopeat, and wood ash with calculated days of cover.
   - Automatically drafts purchase requests to Decision Inbox when cover falls below supplier lead times.
   - Recommends agronomic substitutes when primary bulking agent is depleted.
2. **Feature 13 (Banquet-to-Biomass Planner):**
   - Forecasts waste surges from hotel banquet events (e.g. 600-guest wedding producing 270 kg food waste).
   - Stages dry carbon bulking material ($25\%$ ratio for oily banquet food) and rosters extra labour hours.
3. **Feature 20 (Odor Complaint Loop & Reputation Shield):**
   - 15-second guest/staff QR complaint logging with location zones and symptoms.
   - Correlates reports with wind direction and pit methane state to attribute the likely source pit with confidence scoring.
   - Generates monthly Reputation Shield summaries.
4. **Feature 21 (Incident Room & After-Action Reports):**
   - Severity-triggered Incident Room for overheating fire risks, multi-node blackouts, or leachate leaks.
   - Formulates verified timelines, checklists, and seals After-Action Reports with Wave 1 Merkle proofs.
5. **Feature 7 (Safe Compost Proof — Time & Temperature Certificate):**
   - Confirms thermal pathogen destruction ($\ge 72\text{ consecutive hours} \ge 55^\circ\text{C}$ with $\ge 2\text{ turnings}$) against SWM-2016 standards.
   - Generates tamper-evident certificates with Merkle seal root hashes.

---

## 2. Test Verification

- **Wave 4 Test Suite:** [`phase-11-wave-4-hospitality-depth.test.ts`](file:///c:/Users/aa/Documents/prithvi_grid_development/packages/api/test/phase-11-wave-4-hospitality-depth.test.ts)
  - 6 of 6 tests passing.
