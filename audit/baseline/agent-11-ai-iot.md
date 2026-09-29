# Agent 11 — AI & IoT Integration Audit (Baseline)
Date: 2026-09-27 · Backend: `http://127.0.0.1:8000/api/v1` (live) · No source edits made. Test-data writes to local dev DB only. Supabase untouched. One model file was temporarily renamed in a fresh (non-server) process and restored byte-identical.

## 1. Verdict

**Integrated as a Demonstration Model** — genuine trained scikit-learn models loaded from disk via joblib, real inference (not hardcoded, not rule-based outputs, not a remote API), per-class probabilities, model version reporting, 503 error path for missing models, DB persistence with timestamps, and frontend display of actual API results with loading/error states and the required disclaimers. IoT is a simulator per the scope document ("Simulated IoT API") and is labelled honestly everywhere ("Simulated IoT reading"). It is not "Fully Integrated" only because (a) IoT is simulated by scope design, and (b) a minor sklearn version skew exists (P3).

## 2. Model inventory (all real files on disk)

| File | Size | Contents | Used for |
|---|---|---|---|
| `app/ml_models/random_forest_binary.joblib` | 1.7 MB | RandomForestClassifier (pickled w/ sklearn 1.9.0) | Adulterated vs raw (12 composition features) |
| `app/ml_models/final_random_forest_multiclass.joblib` | 7.7 MB | RandomForestClassifier | Adulterant class (12 composition features) |
| `app/ml_models/shelf_life_model.pkl` | 71.7 MB | Regressor | Remaining shelf-life hours (8 IoT aggregate features) |
| `app/ml_models/spoilage_model.pkl` | 15.6 MB | Classifier (Low/Medium/High) | Spoilage risk (8 IoT aggregate features) |

Loading: `app/services/ai_service.py::_load()` — lazy, thread-safe (`threading.Lock`), raises `FileNotFoundError` when a file is absent. Routers (`iot_ai.py`, `batches.py`) map it to **HTTP 503** `"AI models are not installed on the server"`. Model version string: `model1-v1 (rf-binary/final-rf-multiclass/shelf-life/spoilage)`, returned in every response. `/ai/status` (auth required) reports `models_loaded`, `model_version`, `disclaimer`. Feature orders verified against `AI_MODEL_AUDIT.md` (12 composition / 8 IoT features, exact order). Freshness formula is the model team's own: `clamp(0,100, predicted_shelf_life_hours / 125.75 × 100)`; quality bands Fresh ≥70 / Medium ≥30 / else Near Expiry; High spoilage → Near Expiry. Anomaly is a documented **rule** (no anomaly ML model — per plan §9.4): High spoilage OR adulterated OR (excursions>0 AND max>10°C). Uncertainty flagged when top probability < 0.6.

## 3. Controlled prediction tests (all via live API, farmer JWT)

| Test | Input | Output | Logical? | Pass/Fail |
|---|---|---|---|---|
| (a) Fresh batch, safe temp | `time_since=2h, avg=3.5°C, max=4.5°C, excursions=0` | `POST /predict/freshness` 200 — score **79.4**, shelf **99.85h**, risk **Low**, class **Fresh**, no anomaly, `spoilageProbabilities {High:0.005, Low:0.985, Medium:0.01}` | Yes | **PASS** |
| (b) Older batch | `time_since=48h, avg=6.5°C, above5=8h, excursions=2` | 200 — score **25.72**, shelf **32.34h**, risk **Medium**, class **Near Expiry**, `isUncertain=true` + "Low confidence — retest recommended." | Yes (degraded, flagged uncertain) | **PASS** |
| (c) High-temp batch | `avg=14°C, max=18°C, above10=4h, excursions=5` | 200 — score **5.99**, shelf **7.53h**, risk **High** (p=0.73), class **Near Expiry**, `anomalyDetected=true`, reasons: "Spoilage risk predicted High", "Cold-chain breach: 5 excursion(s), max temp 18.0°C" | Yes | **PASS** |
| (d) Missing sensor reading | `POST /batches/{newBatch}/score` with 0 readings | **400** — "Not enough temperature readings to score this batch (need at least 2). Generate some via POST /iot/batches/{id}/simulate." | Yes (helpful guidance) | **PASS** |
| (e) Invalid temperature | `temperature_std_c=-1` | **422** — "Input should be greater than or equal to 0" | Yes | **PASS** |
| (f) Unknown batch | `POST /batches/999999/score` | **404** — "Batch not found" | Yes | **PASS** |
| (g) Repeated prediction | Same payload as (a), twice | Full JSON byte-identical (`r1 == r2` True), both 200 | Yes (deterministic) | **PASS** |
| (h) Model unavailable | Renamed `spoilage_model.pkl` in a fresh non-server process, called `ai_service.load_models()` | `FileNotFoundError: Model file missing: .../spoilage_model.pkl`; router code maps to **HTTP 503**. File restored and `cmp`-verified identical. Running server untouched. | Yes | **PASS** |

Adulteration sample: 12 composition features → 200, `adulterationStatus` + both probability dicts + `adulterant` + version + disclaimer. Missing fields → 422. Every response carries `"disclaimer": "Demonstration prediction — not laboratory certification."` verbatim and `modelVersion`.

## 4. Persistence evidence

- Created farm (id 8) + batch (id 4, code `B-8-9903E3`) as farmer.
- `POST /iot/batches/4/simulate` (6h back, 30-min interval, base 3.5°C, 0 excursions) → 201, **13 readings** persisted.
- `POST /batches/4/score` → 201: score **77.88**, Fresh, Low risk (logically consistent with safe-temp simulation).
- `GET /batches/4/predictions` → 200: `ai_prediction` row `id=2`, `freshnessScore=77.88`, `qualityClass=Fresh`, `anomalyFlag=false`, `modelVersion=…`, **`predictedAt=2026-09-27T14:16:41`**. History endpoint returns rows newest-first. ✓ Predictions persist with timestamps and are retrievable.

## 5. IoT audit — simulated, honest, enforced

- Nature: **API-based simulator** (`app/services/iot_simulator.py`, seeded-RNG-capable Gaussian series + raised-cosine excursion bumps). No live hardware. This matches the scope document ("Simulated IoT API").
- Labels: every `ReadingOut` carries `"simulatedLabel": "Simulated IoT reading"` (verified in API JSON); simulate response `label` identical; frontend `DEMO_LABELS.iot = "Simulated IoT reading"` shown on the farmer IoT page header and per-reading.
- Tests: ingest 201 with timestamp + unit (`°C`); missing `reading_value` → 422; unknown batch → 404; unauthenticated → 401; **cross-farmer read/score → 404** (ownership enforced server-side, not just hidden in UI); history listing with `sensor_type` filter + pagination; `SimulateRequest` bounds validated (`hours_back` 0.5–720, `base_temp_c` −30–60, `excursion_count` 0–20).
- Aggregation: `aggregate_iot_features` converts raw readings → 8 model features (linear-interpolation time-above-thresholds, upward-crossing excursion count); raises `ValueError` on empty input; used by `/batches/{id}/score`. ✓ AI consumes simulated readings end-to-end.

## 6. Frontend display evidence (code-verified)

- **Farmer AI page** (`pages/app/farmer/AI.tsx`): real mutations via `usePredictAdulteration`/`usePredictFreshness` → `POST /predict/adulteration`, `POST /predict/freshness`; loading states on buttons, `role="alert"` error states, results show ScoreRing, quality class, shelf-life hours, spoilage/adulteration **probability bars**, anomaly reasons, uncertainty note, and the **API-returned disclaimer**. Saved-predictions card lists DB rows with timestamps via `GET /batches/{id}/predictions` (loading/empty/error states).
- **Farmer BatchDetail**: "Run AI scoring" → `POST /batches/{id}/score`; displays latest stored prediction from API; error alert on failure.
- **Farmer IoT page**: simulate form → real endpoint; "Simulated IoT reading" label displayed.
- **Public `/freshness-engine`**: explainer page (no fake live demo); verbatim disclaimer **"Demonstration prediction — not laboratory certification."** plus honest "demonstration estimates… not laboratory certification" and "Readings shown in this demo are simulated — the pipeline is real."
- No frontend-generated fake scores found: all displayed numbers come from API responses.

## 7. Disclaimer check

| Required text | Found in |
|---|---|
| "Demonstration prediction — not laboratory certification." | Every AI API response (`disclaimer` field), `/ai/status`, farmer AI page, batch detail results, public freshness-engine page (verbatim) |
| "Simulated IoT reading" | Every reading payload, simulate response, farmer IoT page header + readings |

## 8. Issues

| ID | Pri | Module | Detail | Fix status |
|---|---|---|---|---|
| AI11-1 | P3 | AI models | sklearn version skew: models pickled with **1.9.0**, env runs **1.9.1** → `InconsistentVersionWarning` on unpickle. Service suppresses warnings; all test outputs were logically consistent, so no behavioral impact observed. | Open — pin `scikit-learn==1.9.0` in requirements or re-export models with 1.9.1 |
| AI11-2 | P3 | AI packaging | Model artifacts total ~95 MB (`shelf_life_model.pkl` alone 71.7 MB) shipped inside the repo/deployment — heavy for hosting. | Open — consider artifact storage / lazy download |
| AI11-3 | P3 | AI design (note) | Anomaly is a product rule, not an ML model; `/predict/freshness` accepts raw features without a batch link (manual demo tool). Both are documented design, not defects. | Accepted as designed |

No P0, P1, or P2 issues found in the AI/IoT scope.

## 9. Area score: **96 / 100**

- Real trained models from disk, correct feature orders, genuine inference (+30)
- Version reporting, per-class probabilities, uncertainty flagging, 503 error path (+20)
- 8/8 controlled tests pass with logically differentiated outputs (+15)
- Persistence with timestamps + history retrieval (+12)
- Frontend displays real API results w/ loading/error states + both required labels (+12)
- IoT simulated-per-scope, honestly labelled, ownership enforced (+7)
- Deductions: sklearn 1.9.0→1.9.1 skew (−3), heavy model artifacts (−1)

Verdict restated: **Integrated as a Demonstration Model** — everything the scope asks of the AI/IoT module is implemented, connected, honestly labelled, and test-verified. Nothing is hardcoded, stubbed, or misrepresented.
