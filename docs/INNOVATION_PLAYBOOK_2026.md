# Prithvi-Grid Innovation Playbook: 24 High-Value Features for the Smart Spear Platform
**Prepared for the Prithvi-Grid founding team · 23 October 2026**  
*Feature suggestions, to be converted into agent build prompts one at a time*

---

## How to read this playbook

This document proposes twenty-four software features that go beyond the enterprise upgrade prompt you already have. I selected them with four tests. First, does the feature use something only your combination of hardware and software can do, such as a battery-less node inside a compost pit, a sensor-verified labour ledger, or a fleet of pits in one city? A feature any generic dashboard vendor could copy in a weekend is not on this list. Second, does it move a number the business cares about: churn, expansion revenue, sales conversion, gross margin per node, field-service cost, or the time a client takes to see value? Third, can an agentic AI build it on top of the system you already have, using the foundations in the master prompt (the ingestion pipeline, the engine framework, the audit log, the AI Gateway)? Fourth, is it honest? Every feature respects the same ground rules as before: deterministic code makes decisions, Gemini is the only AI provider and is used for explanation, language and perception, nothing is shown as fact if it is an estimate, and legal or regulatory content is tagged for human review.

Each feature below has the same shape. **Why it matters** explains the business or field problem. **How it works** describes the data, the logic and the moving parts in enough detail that an agent can design it. **Experience** describes what each user sees. **AI role** says exactly what Gemini does, and often that it does nothing. **Build notes** tells the agent what it depends on and what to be careful about. **Measure and risks** lists the numbers to watch and the honest limits. **Priority** labels each feature as Must-win (changes the economics or the moat), Strong (clearly valuable) or Opportunistic (valuable once the foundations exist), with a rough effort estimate in engineer-weeks for a human-reviewed agent build. Treat the estimates as order-of-magnitude guidance.

The features fall into three themes:
- **Features 1 to 7** make the node smarter and the evidence unbreakable.
- **Features 8 to 16** turn data into daily action for the people on the ground and the managers above them.
- **Features 17 to 24** grow the business: enterprise groups, municipal partnerships, sales and trust.

At the end there is a recommended build order and an explanation of how I will turn your chosen features into build prompts.

---

### Feature 1: Harvest-Aware Wake Scheduler (Wake Appointments)
- **Why it matters:** The Smart Spear has no battery, so energy is the scarcest resource in the whole product. Today a node reports on a fixed interval. That wastes energy transmitting when nothing is happening, and worse, the node is often asleep or under-charged at exactly the moment a worker turns the heap. The result is an Inconclusive verdict, a manager who has to review it, and a worker who starts to distrust the system. Fixing this single mismatch improves labour verification, alert timeliness and node survival at the same time.
- **How it works:** The cloud maintains an energy model for each node using the health telemetry already planned: supercapacitor voltage trend, harvest rate, thermal gradient, time-of-day pattern and the measured energy cost of a modem burst. From this it estimates a daily energy budget in relative units with a safety reserve of at least twenty percent. It then spends that budget on a schedule built from three kinds of appointments. Task appointments come from the roster: if Ram is rostered to turn pit 3 between ten and eleven, the node is asked to be charged and awake at ten and to take readings five minutes before, five minutes after, fifteen minutes after and thirty minutes after the claimed action. Risk appointments are created when an engine sees rising risk, such as a methane slope, and ask for denser sampling while energy allows. Housekeeping appointments cover calibration reads and image captures. Between appointments the node runs a minimal heartbeat. The schedule is a compact list of times and sampling modes with a version number, returned in the ingestion acknowledgement, stored in the node’s flash, and replaced by a safe default if the node ever misses an update. The optimiser is a deterministic priority-based allocation (a simple knapsack), so every wake-up has an explanation that can be shown on request.
- **Experience:** HQ sees an Energy Calendar per node with planned versus actual wake-ups and a forecast of energy starvation. The manager sees a Verification Readiness indicator for today’s tasks: green when the node will be awake and charged, amber when at risk. The worker app shows a Sensor Ready light before a task starts, and when the node is not ready it tells the worker to proceed anyway and the verdict will say Checking.
- **AI role:** None in the scheduling itself. Gemini may turn the stored explanation into one plain sentence in Hindi or English.
- **Build notes:** Depends on the payload contract and acknowledgement design (Workstream A2), the command and configuration queue (D4) and node health scoring (D2). Ship the server side first and test it entirely in the fleet simulator before any firmware accepts schedules. Keep a conservative reserve, never schedule when the supercapacitor is below a safe voltage, and roll out by cohort with automatic pause on rising reset counts.
- **Measure and risks:** Watch the Inconclusive rate on task verdicts, messages per node per day, energy-related resets and the share of rostered tasks with a ready node. The risks are firmware complexity and an inaccurate energy model causing brown-outs; mitigate with staged rollout, a hard reserve and a kill switch that reverts every node to the default schedule.
- **Priority:** Must-win. Roughly six to eight engineer-weeks plus firmware coordination.

---

### Feature 2: Proximity Proof, Tap-to-Verify over Bluetooth
- **Why it matters:** Remote verification depends on a sleeping, intermittently connected node. A direct handshake between the worker’s phone and the node gives instant proof that this phone was physically at this pit at this moment, with live readings, even with no mobile signal. It also removes most of the argument about whether a worker really visited a pit, which is the heart of Kaam Ka Saboot.
- **How it works:** The ESP32 already has Bluetooth Low Energy. The proposal is that the node opens a short advertising window when woken by a trigger (a reed switch activated by a magnet on the worker’s key tag, or a scheduled wake from Feature 1). The worker app connects using Web Bluetooth on Android Chrome, sends a random challenge and a hashed worker identifier, and the node answers with a message that includes pit ID, node time, the last few readings and a health snapshot, signed with the device’s secret key. The phone stores this Proximity Proof locally and syncs it later. The server verifies the signature with the device key, checks the challenge against replay, and records the proof as a strong evidence signal in the Kaam Ka Saboot engine. Technicians can use the same channel to pull diagnostics and run calibration checks at the pit with no network.
- **Experience:** A large button says Pit ko chhoo kar tap karein. The phone vibrates and a green tick says Pit se jud gaya. If Bluetooth is unavailable the worker simply continues with the normal flow.
- **AI role:** None.
- **Build notes:** This is a hardware-dependent feature. Build the server side now (proof format, verification endpoint, evidence signal, flagged UI), and record the firmware requirements in the hardware recommendations document for your firmware engineer to cost: wake trigger, advertising window energy, and signing. Web Bluetooth is not available on iOS Safari, so this is an Android-first feature, which matches your workforce. Use only standard, reviewed cryptographic primitives and do not invent a protocol.
- **Measure and risks:** Track the share of verified tasks backed by proximity proof, attempted replays and the energy cost per handshake. Risks are battery-less energy drain, user friction and false confidence; the proof shows presence, not that work was done well, so it raises confidence and never decides a verdict alone.
- **Priority:** Strong. Four to six weeks of software, plus firmware effort.

---

### Feature 3: Pit Personality Profiles
- **Why it matters:** No two pits behave alike. A hotel kitchen pit full of oily food waste heats fast and goes anaerobic fast; a garden-waste pit heats slowly and dries out. Shared thresholds therefore raise false alarms in one pit and late alarms in another. Learning each pit’s own behaviour turns accumulated data into personalised intelligence that a competitor cannot copy without your history.
- **How it works:** For every observed intervention (turning, a measured amount of water, a measured amount of sawdust, a weighed new load) the system estimates how this particular pit responds: moisture gained per litre of water for its current mass, temperature rebound time after turning, pH shift per kilogram of additive, methane decay half-life after turning, daily heating rate after a load, thermal inertia (how fast it cools), and the lag between a methane rise and a reported odor. Estimates come from simple, interpretable methods (event-study regression with weather as a covariate) stored with confidence intervals and sample counts. For a new pit with few events the system borrows strength from its pit profile (hospital, hotel kitchen, garden) using partial pooling, so a cold-start pit begins with sensible priors and moves toward its own behaviour as evidence accumulates. Engines then use the personality: thresholds become bands around the pit’s own normal, Kaam Ka Saboot compares a claimed turning with this pit’s expected response so a heavy pit is not mistaken for fraud, and dose recommendations use the pit’s own coefficients. The system also detects personality drift, for example when the waste mix changes.
- **Experience:** A Pit Fingerprint page shows a small radar chart and plain statements such as This pit dries quickly, so water more often, each with a confidence level and the number of events behind it.
- **AI role:** Gemini only rewrites the structured findings into friendly language; it computes nothing.
- **Build notes:** Depends on reliable intervention logging, the engine framework (Workstream B) and the learning loop in Workstream S1. Run in shadow mode first so personalities are computed and displayed as Experimental without changing any alert. Promote a coefficient into live use only when it has a minimum sample size and a backtest shows improvement, and always keep a switch to fall back to profile defaults.
- **Measure and risks:** Track false-alarm rate per pit per week, verification accuracy, dose-recommendation accuracy and the share of pits with a mature profile. The main risk is spurious correlation from confounders such as rain; mitigate with covariates, intervals and mandatory human approval of any profile that changes alert behaviour.
- **Priority:** Must-win. Six to eight engineer-weeks.

---

### Feature 4: Virtual Sensors and the Sensor Trust Score
- **Why it matters:** Sensors fail in acidic, wet compost: pH probes drift, moisture sensors corrode, MQ-4 elements get poisoned. Every failure is either a blind period or a field visit, and field visits are the largest hidden cost in a hardware subscription at Rs. 750 per node per month. Ignoring bad data is the minimum; the better product estimates the missing signal from the others and tells users honestly how far to trust each sensor.
- **How it works:** Build small, interpretable virtual sensor models. A moisture trend can be estimated from the thermal response after watering, the elapsed time and the weather; a pH-risk proxy from the temperature trajectory, methane and time since loading; a methane proxy from pressure and temperature decay. Each virtual estimate is labelled Estimated, carries a wide uncertainty band, never overrides a healthy real sensor, and is barred from being the sole basis of a Fake verdict or of compliance evidence. In parallel compute a Sensor Trust Score from zero to one hundred for each sensor, combining calibration age, drift against similar pits, stuck and noise events, agreement with the virtual estimate and uptime. The score lowers engine confidence automatically, triggers maintenance, and drives a truck-roll avoidance routine: before any dispatch the system tries remote steps (force a reading, request a calibration read, buzzer test) and only then creates a visit, bundled with other visits nearby.
- **Experience:** Sensor health cards in the manager and HQ apps with traffic lights, and an HQ list sorted by probable failure in the next fourteen days.
- **AI role:** None for the models; Gemini may explain a trust score in plain language.
- **Build notes:** Depends on the quality layer and calibration subsystem (A7, A8), node health prediction (D2) and survival analysis (S5). Fit models on simulator data and real fleet history, backtest them, and keep every virtual value visibly distinct from measured data in storage and in the interface.
- **Measure and risks:** Watch field visits per hundred nodes, time to detect a failing sensor, and the share of pit-days with at least one trusted measurement set. The risk is users mistaking an estimate for a measurement, so use distinct styling, labels and restricted use.
- **Priority:** Strong. Five to seven engineer-weeks.

---

### Feature 5: Evidence Chain with a Daily Seal, and the Pit Passport QR
- **Why it matters:** A hashed compliance PDF proves the PDF was not altered after generation. A hospital auditor or municipal inspector will ask the harder question: how do we know the underlying readings and labour records were not edited later, even by your own staff through the data grid? Trust is the product, and this feature makes it demonstrable.
- **How it works:** Every evidence-bearing record (telemetry batch, labour claim, manager override, calibration, weight log, uploaded document) is converted to a canonical form and hashed. Each day, per tenant, these hashes are combined into a Merkle tree and the daily root is chained to the previous day’s root and stored in an append-only collection. The roots are published to a public Seal Ledger page, and optionally anchored with an external trusted-timestamping service or emailed to a compliance mailbox the client controls. Any document then includes inclusion proofs for the records it cites, and a verification page lets anyone check them. Edits through the data grid never overwrite; they create a new version, the original stays in the chain, and the verification page shows Amended after sealing with the reason, which is more credible than pretending nothing changed. The Pit Passport QR extends this to the physical world. Each pit has a QR plate. Scanning it opens a public page with no login showing a signed, time-stamped summary: pit ID, current state, thirty-day health summary, number of verified tasks, last calibration date and seal status, without worker names or precise data. A PIN unlocks more detail for the facility’s own staff, and an inspector walking the site can see proof at the pit itself.
- **Experience:** A Sealed badge appears on reports and key screens, with a Verify button beside it.
- **AI role:** None; this is deterministic cryptography.
- **Build notes:** Extends the audit chain (C4) and compliance PDF (F6). Use standard hash functions and mature libraries, canonical JSON, and batch processing per tenant per day. Describe the result as tamper-evident, never tamper-proof, and mark all wording LEGAL-REVIEW.
- **Measure and risks:** Verification page visits, inspector usage, and passing client security reviews. Risks are overclaiming and complexity; keep the public page minimal and the explanation simple.
- **Priority:** Must-win. Five to six engineer-weeks.

---

### Feature 6: Evidence Strength Score
- **Why it matters:** Clients and inspectors need to know not only a number but how far to trust it. A compliance line marked Evidence complete because three readings exist from an uncalibrated sensor is not equivalent to one backed by ninety-six percent coverage and a fresh calibration. False comfort is a legal and reputational risk for you and for the client.
- **How it works:** For any displayed claim (a compliance line, an ROI figure, a batch quality statement, a carbon estimate, a labour completion rate) compute an Evidence Strength level of Strong, Moderate or Weak with a short breakdown. The inputs are coverage (the share of expected data actually present), sensor trust (calibration age and quality flags), corroboration (whether independent signals agree), freshness, human attestation (a manager confirmed it), and provenance (whether the data was amended). The weights live in versioned configuration tagged LEGAL-REVIEW, and the formula is visible in the interface. Beside each Weak or Moderate claim the system offers specific steps to strengthen it, such as calibrate the pH probe by a date or log weights daily this week.
- **Experience:** A small pill beside numbers and in PDFs, a tooltip with the breakdown, and an HQ view of tenants with a high share of weak evidence so customer success can help early.
- **AI role:** Gemini phrases the strengthen-this suggestions from the structured gap list; all scoring is deterministic.
- **Build notes:** Depends on the quality and calibration work (A7, A8) and the compliance and ROI features (F6, F7). Define a registry of claim types and their evidence rules, unit-test the scoring thoroughly and guard against gaming by tying strength to data the user cannot simply edit.
- **Measure and risks:** Share of claims rated Strong, reduced disputes with inspectors and clients, and improved calibration discipline. Risk is confusing complexity, so show three levels by default and keep detail one click away.
- **Priority:** Strong. Three to four engineer-weeks.

---

### Feature 7: Safe Compost Proof, a Time and Temperature Batch Certificate
- **Why it matters:** Buyers such as nurseries and farmers, and hospitals using compost in their own gardens, want to know that compost was processed hot enough for long enough to reduce pathogens and weed seeds. Today they rely on word of mouth. Your sensors can produce a verifiable time-and-temperature history for every batch, which supports selling compost at a better price and strengthens sustainability reporting.
- **How it works:** For each batch (Workstream L1) compute exposure metrics: consecutive hours above configured temperature thresholds, the number of turnings during the hot phase, minimum temperature observed, curing duration, and end-of-batch moisture and pH. Compare them with a criteria profile configured by an expert. The agent must not hard-code any criteria, because accepted time-and-temperature requirements differ between standards and jurisdictions, and every profile is tagged LEGAL-REVIEW. The output is a certificate stating Criteria met, Criteria not met, or Insufficient evidence, with the chart, the evidence strength level from Feature 6, a hash and a verification QR from Feature 5. A QR label on each compost bag leads to a Batch Passport page. The certificate states plainly that it is a process record, is not a laboratory test, and cannot cover parts of the pile the probe did not reach.
- **Experience:** When a batch is marked ready the manager receives a notification with a download button for the certificate, and buyers scanning a bag see the passport.
- **AI role:** Optionally drafts a buyer-friendly description from the structured result, reviewed by the manager before publishing.
- **Build notes:** Depends on batch management (L1), time-series storage (A5) and Features 5 and 6. A single probe gives limited spatial coverage, so surface that limitation in the document and add multi-depth probes to the hardware recommendations.
- **Measure and risks:** Certificates issued, compost sold at a premium, buyer scans. Risk is overclaiming, so wording and criteria need review by an agronomist and a lawyer before any certificate leaves the building.
- **Priority:** Strong. Three to five engineer-weeks.

---

### Feature 8: Pit Health Index with Explain-and-Fix
- **Why it matters:** A manager with ten pits and forty numbers per pit cannot tell at a glance what needs doing. A sales demo needs one memorable number. HQ needs a fair way to rank hundreds of pits. A single, honest, decomposable score solves all three problems, provided it explains itself and tells the user what to do about it.
- **How it works:** The index runs from zero to one hundred and is built from sub-scores that are always visible: Thermal (time inside the target band), Moisture, Acidity, Aeration (methane and odor risk), Progress (maturity trajectory against expectation) and Data Trust (sensor trust and evidence strength from Features 4 and 6). Weights depend on the pit profile and, once Feature 3 is mature, the bands are relative to the pit’s own personality. The score is computed daily and also live when readings change. Two safeguards keep it honest: an open critical alert caps the index at amber regardless of the arithmetic, and missing data produces Not enough data rather than a falsely low or high number. The Explain-and-Fix panel names the top two drags on the score and the single action that would raise it most, with an expected effect drawn from the pit’s coefficients and a one-tap button that creates the task. Show a thirty-day trend and a healthy-days percentage. The facility index is a load-weighted average, but the worst pit is always shown next to it so a good average can never hide a bad pit.
- **Experience:** A coloured ring on each pit card, a league table for HQ, a facility score on the manager home screen and a one-line score in every report.
- **AI role:** Gemini turns the structured explanation into a short Hindi or English sentence. It never changes the score.
- **Build notes:** Version the formula and keep it in configuration. Backtest it against later outcomes (alerts, odor reports, crashes) to confirm that a falling index genuinely precedes trouble, and publish that correlation internally. Make the index depend mostly on sensor data rather than self-reported claims so it cannot be inflated by logging.
- **Measure and risks:** Correlation with subsequent incidents, share of managers who open the Explain-and-Fix panel, and the time from index drop to action. The risk is Goodhart’s law, where people optimise the score instead of the pit; the sensor-based design and the critical-alert cap limit it.
- **Priority:** Must-win. Three to four engineer-weeks.

---

### Feature 9: Aaj ka Plan, a Next-Best-Action Daily Planner
- **Why it matters:** Dashboards inform; they do not instruct. A ground worker needs to know what to do first, and a manager loses an hour each morning assigning tasks by phone. Converting every signal in the system into a short, ordered, explained task list is the step that turns monitoring into outcomes, and it is the daily habit that makes the product sticky.
- **How it works:** Each morning, and again whenever something material changes, a deterministic planner builds a task list for each worker. Candidate tasks come from standing schedules (turn every few days), open alerts and Sanjivani recipes, odor and overload predictions, weather playbooks (Feature 10), overdue verifications, material shortages (Feature 12), expected intake (Feature 13) and maintenance. Each candidate is scored on urgency (risk multiplied by time left before harm), expected benefit from the pit’s response coefficients, effort in minutes, and travel between pits using the zone or coordinates captured in setup. The planner then picks an ordered list that fits the worker’s rostered hours with a buffer, putting safety items first. Every item carries a one-line reason such as Methane has been rising for six hours and this pit was last turned three days ago. Managers can pin, swap or defer items, and the accepted plan flows into the roster and into Kaam Ka Saboot as the expected work. The plan is cached for offline use and re-planned when connectivity returns.
- **Experience:** The Safai Mitra sees three to seven large cards with audio such as Pehle pit 3 palatna hai, kyunki methane badh rahi hai, and a progress bar for the shift. The manager sees plan coverage and any risk that no one is planned to address. A small Plan galat tha button collects feedback on bad suggestions.
- **AI role:** Gemini phrases the reasons in Hindi, Hinglish or English from structured data. Selection and ordering are deterministic.
- **Build notes:** Depends on the engines (Workstream B), rostering (F3), the offline layer (E1) and the task-card configuration (F5). Include a schedule-only fallback if engines are unavailable, balance workload fairly across workers, never exceed rostered hours, and log why each task was chosen for auditability.
- **Measure and risks:** Task completion rate, time from alert to action, pit health improvement and worker satisfaction. A poor plan erodes trust fast, so launch in suggestion mode for a few weeks with prominent override and feedback controls.
- **Priority:** Must-win. Five to seven engineer-weeks.

---

### Feature 10: Weather-Aware Pre-emptive Playbooks
- **Why it matters:** In Indore the monsoon floods open pits and a heatwave dries them in a day. A large share of pit crashes are weather-driven and predictable twelve to forty-eight hours ahead, yet today’s alerts fire after the damage. Acting before the weather arrives is the difference between a service that reports problems and one that prevents them.
- **How it works:** The system ingests a forecast (rainfall amount and probability, temperature, humidity, wind) from a conventional weather provider and evaluates a library of playbooks stored as structured data. A playbook has a trigger (for example forecast rain above a threshold in the next twelve hours), pit conditions (open pit, moisture already high), recommended actions with lead times (cover the pit, add dry bulking material, clear the drainage channel, reduce watering), and an expected effect taken from the pit’s coefficients where known. There are playbooks for heavy rain, heatwave, cold snap, still humid days that raise odor risk, and local calendar events that change waste volumes, such as festivals and wedding season. Triggered playbooks create tasks in Aaj ka Plan at the right time. After the event the system checks the outcome (did moisture stay in band, did odor risk rise) and tracks forecast accuracy so thresholds can be tuned. Forecast uncertainty is handled by acting only above a probability or amount threshold that managers can tune per facility.
- **Experience:** A push or WhatsApp message such as Kal baarish ka andesha hai, pit 2 aur 4 dhak dein, with a one-tap done. HQ sees a city weather-risk map showing which pits are exposed.
- **AI role:** Phrasing only.
- **Build notes:** Build a weather provider abstraction with caching and cost tracking. Playbook content must be reviewed by an agronomy expert before activation. Use the same task pipeline as other plan sources so nothing new is needed on the worker side.
- **Measure and risks:** Weather-related alert counts, moisture excursions after rain, and playbook outcome rates. The risk is over-alerting on bad forecasts, handled with thresholds and outcome tracking.
- **Priority:** Strong. Three to four engineer-weeks.

---

### Feature 11: WhatsApp Voice-Note Logging
- **Why it matters:** Many workers will not want another app, but every one of them has WhatsApp, and speaking is the natural way to report work. Logging friction directly limits the completeness of your data, and completeness is what makes the compliance matrix and labour verification credible. If a worker can log a task by sending a ten-second voice note, completeness rises sharply.
- **How it works:** The worker sends a voice note, text or photo to the company’s WhatsApp Business number. A webhook verifies the provider signature and passes audio to the AI Gateway, where Gemini extracts a structured draft against a strict schema: an action type from the closed list, a pit from the worker’s rostered pits, a quantity and unit, and a time reference such as aaj subah, each with a confidence. The system replies in Hindi with a short summary and interactive buttons (Haan, Nahi, Badlein). Only after Haan does it create the ledger entry, marked as source WhatsApp voice, and it then proceeds exactly as a normal claim, so sensor verification still applies. When the draft is ambiguous the system asks at most one clarifying question. Phone numbers are bound to workers through an OTP step, unknown numbers are ignored, and audio is deleted after a short retention period.
- **Experience:** The worker installs nothing. Supervisors see these entries flagged as logged by voice and can filter them.
- **AI role:** Gemini audio understanding for Hindi and Hinglish, constrained to a closed vocabulary with mandatory human confirmation. It never creates an entry on its own.
- **Build notes:** Use a WhatsApp Business provider (not an AI service), approved message templates and interactive buttons, strict rate limits and per-tenant message budgets. If Gemini is unavailable reply with a link to the app. Create a golden set of recorded Hindi samples in varied noise and accents and run it in CI.
- **Measure and risks:** Logging completeness, extraction accuracy on the golden set, confirmation rate and cost per entry. Risks are dialects and noise (confirmation handles them), wrong pit mapping, voice privacy and messaging-platform policy compliance, all of which are LEGAL-REVIEW items.
- **Priority:** Must-win for adoption. Four to five engineer-weeks.

---

### Feature 12: Bulking Material Inventory and Reorder Autopilot
- **Why it matters:** Recipes and routine practice need carbon-rich bulking material such as sawdust, dry leaves, cocopeat or straw. Running out is a classic cause of pit crashes, and the facility usually discovers the shortage when a Sanjivani alert fires and the sawdust is gone. It is also a real cost line that clients want to control.
- **How it works:** Keep a stock ledger per facility and material with unit conversions (bags, trolleys, kilograms). Consumption is estimated automatically from logged additions and recipe usage, and corrected by quick counts the worker can enter with the visual calculator. A demand forecast combines the intake forecast (Features 13 and Workstream M), typical recipe patterns and season. For each material compute days of cover and a reorder point using supplier lead times from a supplier directory with prices. When cover falls below the point the system drafts a purchase request for manager approval and, optionally, a message to the supplier. It never buys anything automatically. It also warns before known high-need periods such as a rainy week. Sanjivani consults the stock: if a recipe needs sawdust that is out of stock, it proposes an expert-approved substitute from a substitution list and flags the shortage. Over time the system reports material cost per kilogram of compost.
- **Experience:** A worker taps Maal khatam on a material card. The manager sees an Order now card in the Decision Inbox (Feature 17) with quantity, supplier and cost.
- **AI role:** Optionally drafts the supplier message in the right language.
- **Build notes:** Needs a small data model, the C:N blending calculator from L4, and a substitution table reviewed by an agronomist. Prompt for periodic quick counts so the ledger does not drift.
- **Measure and risks:** Stock-out events, material cost per kilogram of compost, and fewer crashes attributed to missing material. Inaccurate counts are the main risk; periodic counts and a visible confidence indicator address it. A supplier referral commission is a possible revenue line and needs a commercial and legal check.
- **Priority:** Strong. Three to four engineer-weeks.

---

### Feature 13: Banquet-to-Biomass Planner
- **Why it matters:** Hotel waste is spiky. A six-hundred-guest wedding produces far more food waste than a normal day, and an unplanned surge overloads pits, breaks labour plans and creates odor on the very day the hotel most needs to look good. Hotels already know their events days in advance, so the information exists; it just never reaches the pit.
- **How it works:** The banquet or F&B manager adds events in about twenty seconds (date, guest count, meal type, vegetarian share, outdoor or indoor), by form, CSV, calendar import, or by pasting the event order text. The system learns kilograms of waste per guest by event type for that facility, starting from priors and updating from actual intake logs using simple regression with shrinkage. For each event it forecasts waste mass and its character (wet and greasy versus dry), then plans which pit should receive it, how much bulking material to stage, whether a pre-event turning is needed, whether capacity suffices according to the overload engine, and how many extra labour hours to roster. After the event it records actual versus forecast and improves. Hospitals use the same engine with census and diet-order data instead of events, so build it as a generic driver-based forecast. The resulting kilograms-per-guest metrics are also a valuable food-waste reduction report for the hotel’s F&B team, which creates an upsell path.
- **Experience:** The banquet manager adds an event in seconds. The facility manager sees a plan card, and workers see extra tasks in Aaj ka Plan on the day.
- **AI role:** Gemini can extract event details from a pasted order or message, always shown for confirmation.
- **Build notes:** Builds on the generation analytics in Workstream M3, bulking inventory (Feature 12) and the plan engine (Feature 9). Fall back to baseline forecasts when no events are entered.
- **Measure and risks:** Forecast error, overflow incidents avoided, and the share of events entered. The main risk is that events are not entered, so make entry trivially easy and allow staff to enter the guest count by WhatsApp message.
- **Priority:** Strong for the hotel segment. Four to five engineer-weeks.

---

### Feature 14: Ustaad Mode, Capturing Tacit Knowledge
- **Why it matters:** The most valuable composting knowledge in a facility is in the heads of its most experienced workers and supervisors, who know that this pit smells a particular way just before it goes wrong. That knowledge leaves when they do, and your agronomy reviewers cannot be at every site. Capturing and validating it builds a data asset no competitor can buy, and it gives workers recognition that a surveillance-style product never does.
- **How it works:** In the Safai Mitra app or by WhatsApp voice, an experienced user records a short Ustaad ki salah tied to a situation (pit, symptom, season). Gemini transcribes it and structures it into a candidate knowledge item with situation, observation, action, expected result and caution, and attaches what the sensors showed at that moment so every tip is grounded in data. Candidates enter a review queue where an agronomy expert accepts, edits or rejects them. Accepted items become library entries or recipe variants with versioning and optional credit to the contributor. Tips are clustered using embeddings so advice repeated by many workers rises to the top. Workers can later ask by voice for tips about a situation, and Pit Copilot may cite only approved items.
- **Experience:** A large microphone button labelled Ustaad ki baat batayein, a thank-you and status for each submission, and for HQ a review queue with clusters and sensor context beside each tip.
- **AI role:** Gemini transcription, structuring and embedding-based clustering. Every output is a draft, and nothing becomes advice without expert approval.
- **Build notes:** Depends on the AI Gateway (J1) and embeddings search (J4). Require consent for voice use and for attribution. Moderation is absolute for safety: advice involving chemicals or hazardous practices must be rejected by the expert gate and never exposed.
- **Measure and risks:** Tips submitted, accepted share, usage of approved tips, and recipe improvements. The risk is unsafe advice leaking, so unapproved items are invisible to everyone except reviewers.
- **Priority:** Strong, with long-term moat value. Three to four engineer-weeks.

---

### Feature 15: Skill Passport and the Team Healthy-Days Pool
- **Why it matters:** Turnover among ground staff erodes quality, and workers are rarely recognised. A verification system can feel like surveillance. Giving workers something positive and portable changes how the product is received, improves retention for your clients, and gives you a story that procurement teams and municipal partners respect.
- **How it works:** The Skill Passport is a verifiable digital card, with a QR using the same signing approach as Feature 5, listing completed micro-lessons, safety training, the number of verified tasks (counts, never reliability scores), languages and tenure. It belongs to the worker, is shared only with consent, and can be shown to future employers or contractors. The Team Healthy-Days Pool is an optional monthly incentive the manager configures: a rupee pool and rules that divide it in proportion to verified tasks and the team’s pit healthy-days. The system produces a recommendation with the transparent formula and the evidence list, the manager approves, and a payout file is exported; the system never pays or deducts automatically. Protections include treating Inconclusive as neutral, resolving disputes before computing, no public individual ranking, caps on the weight of any single metric, and simulations that test how easily the rules could be gamed.
- **Experience:** Workers see positive framing such as Is hafte aapne 12 kaam poore kiye aur aapke pit 5 din healthy rahe. Managers see a pool calculator with the formula and a preview.
- **AI role:** Phrasing only.
- **Build notes:** Depends on the fairness and privacy work in Workstreams O and C6 and on Kaam Ka Saboot v2. Any wage or incentive rules and the legal status of credentials are LEGAL-REVIEW items.
- **Measure and risks:** Worker retention, task completion rate and dispute rate. Incentives can distort behaviour, so pilot with a few facilities and require manager approval for every payout.
- **Priority:** Opportunistic. Four to five engineer-weeks.

---

### Feature 16: Alert Fatigue Governor and Silent-Failure Watchdog
- **Why it matters:** Two opposite failures kill monitoring products. Too many alerts teach people to ignore all of them. And silence, when something expected simply stops happening, goes unnoticed because nothing fires. A product that handles both earns the trust of busy managers and avoids the quiet failure that ends a contract.
- **How it works:** The Governor is a policy layer between the engines and the notification service. It learns each user’s engagement (acknowledgement rate, time to acknowledge, ignored items) and applies budgets on interruptive notifications per day by role, merges related alerts into a single incident, suppresses duplicates, moves low-severity items into a digest delivered at the user’s most responsive time, and escalates only when severity or unacknowledged time demands it. Critical safety alerts bypass every limit. A Why didn’t I get this page makes suppression transparent. The Watchdog detects absence. From schedules and history it knows what should have happened (a daily intake log, a turning every few days, shift check-ins, node heartbeats) and raises an Absence alert with context such as Kitchen waste was logged by six in the evening on ninety-four percent of past days and nothing is logged today. It also separates a single-node fault from a group failure, for example all nodes on one cell tower going quiet, which is a connectivity incident rather than many pit problems.
- **Experience:** Calmer phones, a weekly summary reading Alerts you got: 14, actions taken: 11, and HQ sees clustered incidents instead of floods.
- **AI role:** None.
- **Build notes:** Lives in the notification abstraction (I5) and uses incident grouping from Workstream B. Start in shadow mode, recording what it would have suppressed, and audit suppressed items before enforcement.
- **Measure and risks:** Notifications per user per day, acknowledgement rate and time, and missed-event detection. The risk is suppressing something important, so critical bypass, shadow mode and audits are mandatory.
- **Priority:** Strong. Three to four engineer-weeks.

---

### Feature 17: Decision Inbox
- **Why it matters:** Facility managers and hospital administrators do not want another dashboard to study. They want to be told, briefly, which decisions are waiting for them and what each one costs or risks. A queue of decisions with context and one-tap approval converts the product from something people check into something they run their operation through, and it is the most direct way to make the manager feel the product is working for them.
- **How it works:** Define a decision as a structured object: a type, a question, a recommended option with reasons, alternatives, the evidence behind the recommendation, a cost estimate where relevant, a deadline, and what happens if nothing is done. Many parts of the system generate decisions: reorder bulking material (Feature 12), add a probe replacement visit, approve or reject a worker dispute, accept a recommended threshold change, approve a payout recommendation (Feature 15), add a pit when forecast capacity runs out, renew an expiring licence, or approve an auditor share link. Each decision type has an owner role, an escalation rule when it ages, and a defined effect when approved, which runs through the normal permission and audit pipeline so approval is never a back door. Decisions are ranked by deadline and consequence, bundled when related, and expire gracefully with a recorded outcome. Every approved or rejected decision is stored with its reason, which builds an operational history the client can show an auditor.
- **Experience:** A single Decisions tab with a count badge, cards with a headline, one-sentence recommendation, expected cost, and three buttons: Approve, Not now, See evidence. A weekly email or WhatsApp lists what is still pending.
- **AI role:** Gemini may draft the one-sentence recommendation and the plain-language reason from the structured fields; the recommendation itself is chosen by deterministic rules.
- **Build notes:** Create a generic decision framework (types, owners, lifecycle, audit) rather than one-off screens, so other features can register decision types without new UI. Make approvals idempotent and permission-checked, and show the evidence strength (Feature 6) on every decision that rests on data.
- **Measure and risks:** Median time to decision, decisions expired without action, share of recommendations accepted, and manager logins per week. The risk is a flood of low-value decisions, so a minimum-value filter and the fatigue governor from Feature 16 apply here as well.
- **Priority:** Must-win. Four to five engineer-weeks.

---

### Feature 18: What-If Simulator for Managers and Sales
- **Why it matters:** Before spending money or changing a routine, managers ask what happens if. What if we add two workers? What if we turn less often? What if we add a pit? What if the hotel doubles its banquet volume? A credible answer helps retain and expand existing clients, and the same engine becomes a powerful sales tool when a prospect asks what would our pit look like with your system.
- **How it works:** The simulator reuses the scenario generator and the pit personality models (Features 3 and 8, Workstream B6, S4). The user chooses a pit or facility and changes one or more levers: turning frequency, watering schedule, labour hours, waste mix, intake volume, number of pits, material stock policy. The system replays the recent past under the proposed change using the pit’s learned response, runs the forward projection for a chosen horizon, and reports a distribution of outcomes rather than a single number: expected healthy-days percentage, probability of an odor event, capacity-full date, labour hours, material cost and evidence-readiness impact. Every output is labelled Estimated and shows the assumptions, the confidence level and the data it relies on. For sales, a prospect mode works from a site survey and priors instead of history and is clearly labelled Indicative. Scenarios can be saved, compared side by side and attached to a Decision Inbox item.
- **Experience:** A friendly panel with sliders and a comparison chart with an uncertainty band. The summary is written in plain language with the key assumption on top.
- **AI role:** Gemini narrates the comparison from the numbers returned by the simulator and may suggest which lever to try, but never produces a number itself.
- **Build notes:** Mark the feature Experimental until backtests show the projections are calibrated, meaning actual outcomes fall within the stated intervals about as often as claimed. Keep a hard cap on projection horizon, and never allow a what-if result to flow into compliance documents or ROI figures presented as facts.
- **Measure and risks:** Scenario runs per manager, accepted recommendations, and calibration of intervals. The major risk is false precision, so always show ranges and refuse to run when data is too thin.
- **Priority:** Opportunistic, but valuable for sales. Six to eight engineer-weeks after Features 3 and 8.

---

### Feature 19: Group Control Tower and Policy Templates
- **Why it matters:** Your target clients include hotel chains and hospital groups with several properties. Their head office does not want to log into five portals. It wants to see all properties together, compare them fairly, and enforce a standard way of working. Selling to the group rather than to one property multiplies contract size and makes the product much harder to remove.
- **How it works:** Add a Group tenant level above facilities. The Control Tower shows a roll-up of pit health, open alerts, labour completion, evidence readiness, material cost and compost output across properties, with a fair comparison view that normalises for size and waste type and flags properties that differ because of missing data rather than poor practice. Policy Templates let head office define standard operating policies once and push them to properties: task card sets, verification windows, escalation chains, notification rules, report schedules and compliance requirement mappings. Each property may override only the fields the group allows, and every override is visible to the group. Template changes are versioned, previewed (how many pits are affected) and rolled out in stages with rollback, like the threshold configurator. Group-level roles (group admin, regional manager, group auditor) see only the properties they are scoped to, and the tenant isolation tests must prove no leakage between groups.
- **Experience:** A single map and league table for the group, drill-down into any property, a Policy page listing templates and compliance with them, and a monthly group report for leadership.
- **AI role:** Gemini may summarise the group’s month in narrative form from verified figures, with every number checked by code before sending.
- **Build notes:** Depends on the central tenant isolation and custom-role work (C1, C2) and the configuration layering in Workstream B. Treat the group level as a first-class part of the data model and the authorisation layer, not a view bolted on.
- **Measure and risks:** Number of group contracts, nodes per group, template adoption and override rate. The main risk is data-model complexity and leakage, which the cross-tenant test suite must cover from day one.
- **Priority:** Must-win for enterprise sales. Six to eight engineer-weeks.

---

### Feature 20: Odor Complaint Loop and Reputation Shield
- **Why it matters:** For a hotel, a guest complaining about smell is a reputational event. For a hospital, odor near wards is a patient-comfort and infection-control concern. Today an odor complaint is a phone call that nobody links to the pit data. If every complaint and every near-miss is captured and correlated with sensors, wind and operations, the product can both reduce complaints and prove it, which is a powerful retention argument.
- **How it works:** Provide a one-tap complaint and observation logger usable by front desk, housekeeping, security or any staff through a simple link or QR in the staff area, with location (choose from a short list of zones), type (smell, flies, leachate, noise), severity and an optional photo. Each report becomes a time-stamped event with the facility’s wind direction and speed from the weather feed and the state of nearby pits. The system builds an Odor Risk Map for the facility, combining pit methane and odor-risk predictions, wind direction and the zones where complaints occurred, and shows which pit is the most likely source for each complaint with a stated confidence. The same events feed the precision-and-recall measurement for the Odor Predictor (B3), improving the engine. Add a prevention mode: when wind blows from a risky pit towards a sensitive zone and odor risk is high, the system nudges a mitigation (cover the pit, delay turning until wind shifts, schedule turning at a better time of day). Monthly the manager receives a Reputation Shield summary showing complaints, near-misses averted and trends, with estimates labelled.
- **Experience:** Staff complete a complaint in under fifteen seconds. Managers see a simple map with arrows for wind and shaded zones.
- **AI role:** Gemini may classify a photo or free-text note into the closed complaint types and draft a short root-cause narrative from stored data, always as a suggestion.
- **Build notes:** Depends on weather ingestion (A10), the odor predictor (B3) and the staff-link access model (a limited-scope role without full app access). Keep complaint data free of guest personal information.
- **Measure and risks:** Complaints per month, time to resolve, share attributed with high confidence, and predictor precision. Source attribution can be wrong; show confidence and allow manual correction.
- **Priority:** Strong, especially for hotels and hospitals. Four to five engineer-weeks.

---

### Feature 21: Incident Room and After-Action Reports
- **Why it matters:** Rare serious events, such as an overheating pit with fire risk, a prolonged outage of many nodes, a leachate spill or a worker injury, are handled today by phone calls and memory. Large clients, especially hospitals, expect a structured response and a written report afterwards. A built-in incident process gives them that, and the accumulated after-action reports become the best source of product improvement and of trust with insurers and auditors.
- **How it works:** When a severity threshold is met, or a manager declares an incident, the system opens an Incident Room: a timeline that fills automatically from alerts, sensor readings, notifications, acknowledgements and actions; a roles panel (incident lead, field responder, communications); an action checklist drawn from an expert-approved playbook for that incident type; assignment and acknowledgement with escalation timers; a place to attach photos and voice notes; and a status for stakeholders. Safety-critical incidents such as fire risk use fixed templates and bypass AI phrasing. When resolved, the system generates an After-Action Report containing the verified timeline, response times, what worked, what was late, contributing factors suggested from data, and follow-up tasks entered into the Decision Inbox. Reports are sealed with Feature 5 so they can be shown to insurers or inspectors. Aggregate analytics across incidents show recurring causes.
- **Experience:** A focused, uncluttered screen that works on a phone, with a large status banner and the next action highlighted. Stakeholders can subscribe to updates through WhatsApp.
- **AI role:** Gemini drafts the narrative summary and the list of contributing factors from the stored timeline, labelled as a draft for the incident lead to edit. Nothing in the safety playbooks is AI-generated at runtime.
- **Build notes:** Depends on alert lifecycle and escalation (B2), notification service (I5) and the audit log (C4). Playbooks must be reviewed by safety and agronomy experts, and the system never presents itself as a substitute for emergency services or confined-space procedures.
- **Measure and risks:** Time to acknowledge, time to contain, share of incidents with completed reports, and recurrence rate. The risk is over-reliance during real emergencies, so the first screen always shows emergency contacts and plain safety instructions.
- **Priority:** Strong. Four to six engineer-weeks.

---

### Feature 22: Municipal Partner Portal (Opt-In)
- **Why it matters:** Municipal corporations enforce the rules your clients must meet. Today the relationship is adversarial: inspectors visit unannounced, fines follow. A portal that lets willing clients share verified evidence with the municipality, and lets the municipality see ward-level progress without chasing paper, turns the regulator from a threat into a partner and opens a government-facing revenue line. It also strengthens the whole sales story: clients on the platform get inspected faster and more fairly.
- **How it works:** A separate, strictly scoped portal for municipal users. Clients opt in, per facility and per data category, to share a limited view: compliance evidence summaries, Pit Passport status, seal verification, calibration status and diversion totals. The municipality sees an aggregated ward and zone dashboard with participation, diversion volumes, evidence-strength distribution, and a list of opted-in facilities that are ready for streamlined inspection, with an offline-capable inspection pack for each. Nothing is shared without consent, consent can be withdrawn at any time with immediate effect, and every access is logged and visible to the client. The portal offers read-only verification of sealed documents and an inbox where the municipality can send notices, which flow into the client’s notice tracker (Workstream N2). For the municipality there are anonymised, aggregated statistics that cannot be traced to a single site when the group is small.
- **Experience:** Municipal users see a clean map and tables with filters by ward, size and evidence strength. Clients see exactly what is shared, with a switch for each category.
- **AI role:** None in the portal itself; Gemini document extraction (J4) may help the client understand and answer a notice.
- **Build notes:** Treat the whole feature as LEGAL-REVIEW: data-sharing consent, public-authority access, retention, and any commercial terms with a municipality. Build the consent engine and scoped roles first, and treat the integration with real municipal systems as research (N3), not an assumption. Reuse the evidence chain and verification pages.
- **Measure and risks:** Opt-in rate, inspector time saved, and the number of notices closed through the portal. The risk is client fear of self-incrimination; solve it with granular consent, a clear explanation of what is shared, and legal advice before launch.
- **Priority:** Opportunistic with large strategic upside. Six to eight engineer-weeks plus legal and relationship work.

---

### Feature 23: Verified Green Badge and Public Impact Page
- **Why it matters:** Hotels and hospital brands want to be seen as sustainable, and guests, patients and corporate customers increasingly ask. A verified, shareable proof of what a property actually does is worth more than a vague green claim and gives every client a reason to talk about your product. It is also free marketing that carries your brand into every lobby and website.
- **How it works:** Each facility can switch on a public Impact Page and an embeddable badge. The page shows only what the client approves: waste diverted this year, compost produced, a time-limited verification seal from Feature 5, the evidence strength level and the methodology link. All numbers come from sealed data, estimates are labelled, and carbon figures appear only if the client opts in and the methodology (L3) has been reviewed. The badge is a small embeddable element that links to the page, and a printable QR plate for the lobby does the same. A freshness rule removes or greys the badge if the underlying data stops arriving or evidence falls to Weak, so the claim can never go stale. Clients control wording within approved templates so claims remain accurate, and every claim is logged.
- **Experience:** A beautiful, fast, mobile-friendly public page with no login, a one-click embed code, and a share card for social media.
- **AI role:** Gemini may help draft a short, accurate summary paragraph from the approved figures within the template, which the client approves.
- **Build notes:** Depends on Features 5 and 6 and on L3. All public wording is LEGAL-REVIEW to prevent misleading green claims. Cache the public page aggressively and keep it free of personal data.
- **Measure and risks:** Pages published, badge impressions, inbound leads attributed to the badge and client retention for badge holders. Misleading claims are the major risk; the template, freshness rule and review process address it.
- **Priority:** Strong for growth. Three to four engineer-weeks.

---

### Feature 24: Survey-to-Quote and Pilot-in-a-Box
- **Why it matters:** Selling to hospitals and hotels involves site visits, spreadsheets, proposals and long waits. If your sales person can survey a site on a phone and give a credible proposal and pilot plan the same day, you shorten the cycle, reduce discounting and start pilots with the right number of nodes. A structured pilot with clear success criteria also converts at a much higher rate than an open-ended trial.
- **How it works:** A Survey app (a mobile view in HQ) lets a sales or technical person record a site: number of pits and sizes, waste sources and kilograms per day, layout, photos, existing practice, local complaints history, and the contact roles. Gemini can propose a first draft of the pit list from the photos, labelled as a suggestion. The system then recommends the number and placement of nodes, an installation plan, a pricing proposal from the plan model, and a conservative ROI scenario using the client’s own inputs, with all assumptions visible and fines treated only as a client-supplied estimate. A proposal PDF is generated in the client’s language. If the prospect agrees to a pilot, Pilot-in-a-Box creates a tenant with a seeded, clearly labelled demo layer, a success scorecard (for example data completeness, alerts handled, labour verification rate, pit health improvement, manager engagement), weekly auto-generated pilot reports from real data, and a decision pack at the end of the pilot that recommends conversion, extension or exit using the agreed criteria. Everything feeds the sales pipeline and customer success views.
- **Experience:** A fast, forgiving mobile form with offline support for use on site, and a proposal ready to send within minutes.
- **AI role:** Photo-based pit suggestions, extraction from client documents with confirmation, and narrative drafting for proposals and pilot reports, all human-reviewed.
- **Build notes:** Depends on plans and packaging (P3), the sales pipeline (P4), the simulator (Feature 18 prospect mode) and the weather and benchmark data. Keep demo data strictly separated from real data and clearly labelled.
- **Measure and risks:** Survey-to-proposal time, pilot-to-paid conversion, and average nodes per signed site. The risk is a proposal that overpromises, so conservative defaults, visible assumptions and an Indicative label are mandatory.
- **Priority:** Strong for growth. Four to six engineer-weeks.

---

## Recommended Build Order

The features depend on one another, so the order matters more than the individual priorities. This sequence respects the foundations in your master prompt and delivers value early.

- **Wave 1: The Trust and Signal Foundation (8–10 weeks):**  
  - Feature 5 (Evidence Chain and Pit Passport)
  - Feature 6 (Evidence Strength Score)
  - Feature 4 (Virtual Sensors and Sensor Trust Score)  
  *These strengthen every later claim and reduce field cost.*

- **Wave 2: The Node and the Pit Become Smart (10–12 weeks):**  
  - Feature 1 (Harvest-Aware Wake Scheduler)
  - Feature 3 (Pit Personality Profiles)
  - Feature 8 (Pit Health Index)  
  *(Feature 2 Proximity Proof runs in parallel on the server side while firmware work is costed).*

- **Wave 3: Daily Action and Adoption (10–12 weeks):**  
  - Feature 9 (Aaj ka Plan)
  - Feature 11 (WhatsApp Voice-Note Logging)
  - Feature 10 (Weather Playbooks)
  - Feature 16 (Fatigue Governor and Watchdog)
  - Feature 17 (Decision Inbox)  
  *This is the wave that most changes how clients feel about the product.*

- **Wave 4: Hotel and Hospital Depth (8–10 weeks):**  
  - Feature 12 (Bulking Inventory)
  - Feature 13 (Banquet-to-Biomass)
  - Feature 20 (Odor Complaint Loop)
  - Feature 21 (Incident Room)
  - Feature 7 (Safe Compost Proof)

- **Wave 5: Enterprise and Growth (10–14 weeks):**  
  - Feature 19 (Group Control Tower)
  - Feature 24 (Survey-to-Quote and Pilot-in-a-Box)
  - Feature 23 (Verified Green Badge)
  - Feature 14 (Ustaad Mode)
  - Feature 18 (What-If Simulator)
  - Feature 15 (Skill Passport and Pool)
  - Feature 22 (Municipal Partner Portal) once legal groundwork is done.

### The Top 5 Core Quick-Wins
If choosing only five features for the next sprint/quarter: **Features 5, 1, 9, 11, and 17**. Together they make evidence unbreakable, fix the biggest verification weakness, direct ground workers, remove logging friction, and give managers a reason to log in daily.
