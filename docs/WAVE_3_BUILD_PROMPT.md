# 📋 Prithvi Grid — Agent Build Prompt: Wave 3 (Daily Field Operations & Adoption)
**Document Classification:** Agent Implementation Specification | **Target:** Wave 3 (Features 9, 10, 11, 16, 17)  
**System Base:** Prithvi Grid v2.0 Enterprise SaaS & Smart Spear Telemetry Architecture  
**Primary Vertical Focus:** Ground Habit Formation, Frictionless Logging & Decision Automation  
**AI Provider Rule:** Google Gemini Only (perception, transcription, audio parsing, narrative drafting; 0% autonomous decision authority)  

---

## 1. Executive Summary & Features Implemented

1. **Feature 9 (Aaj ka Plan — Next-Best-Action Daily Planner):**
   - Ranks candidate tasks by urgency score, prioritizing safety alerts and high-methane mitigation before routine watering.
   - Restricts daily shift workload to 3–7 cards max.
   - Provides plain-language Hindi voice prompts and explanations.
2. **Feature 10 (Weather-Aware Pre-emptive Playbooks):**
   - Automatically activates pre-emptive playbooks (Heavy Rain $\ge 25\text{ mm}$, Heatwave $\ge 42^\circ\text{C}$, Stagnant Humid Odor Risk) 12–48 hours ahead of severe weather events.
3. **Feature 11 (WhatsApp Voice-Note Logging):**
   - Transcribes and parses Hindi voice notes into structured composting actions (`TURNING`, `WATERING`, `ADD_ASH`, `LOAD_WASTE`) and pit identifiers.
   - Enforces a mandatory interactive confirmation step (`Haan` / `Nahi`) before committing to the sensor-verified labour ledger.
4. **Feature 16 (Alert Fatigue Governor & Silent-Failure Watchdog):**
   - Daily interruption budgets per user role (`BWG_MANAGER: 8`, `SAFAI_MITRA: 4`, `SUPREME_HEAD: 12`).
   - Merges duplicate alerts; routes non-critical notifications to digests.
   - Critical safety alerts bypass all suppression.
   - Silent-Failure Watchdog detects missing expected daily actions (e.g. daily intake absent when historically logged 94% of days).
5. **Feature 17 (Decision Inbox):**
   - Replaces passive dashboards with structured decision items (`REORDER_BULKING`, `PROBE_REPLACEMENT`, etc.) featuring recommended options, cost estimates, and inaction consequences.

---

## 2. Test Verification

- **Wave 3 Test Suite:** [`phase-10-wave-3-daily-operations.test.ts`](file:///c:/Users/aa/Documents/prithvi_grid_development/packages/api/test/phase-10-wave-3-daily-operations.test.ts)
  - 9 of 9 tests passing.
