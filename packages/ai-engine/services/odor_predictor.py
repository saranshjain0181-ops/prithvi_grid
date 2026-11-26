import numpy as np
from pydantic import BaseModel
from typing import List

class ReadingPoint(BaseModel):
    timestamp_hours: float # Relative hours (0.0 to 6.0)
    pressure_hpa: float
    methane_ppm: float

class OdorPredictionInput(BaseModel):
    readings: List[ReadingPoint]

class OdorPredictionOutput(BaseModel):
    odor_outbreak_risk: bool
    risk_score_pct: float
    pressure_variance: float
    methane_slope_ppm_per_hr: float
    compaction_detected: bool
    advance_warning_hours: int
    recommendation: str

def predict_micro_atmospheric_odor(data: OdorPredictionInput) -> OdorPredictionOutput:
    if len(data.readings) < 3:
        return OdorPredictionOutput(
            odor_outbreak_risk=False,
            risk_score_pct=10.0,
            pressure_variance=0.0,
            methane_slope_ppm_per_hr=0.0,
            compaction_detected=False,
            advance_warning_hours=24,
            recommendation="Insufficient historical telemetry for statistical regression."
        )

    times = np.array([r.timestamp_hours for r in data.readings])
    pressures = np.array([r.pressure_hpa for r in data.readings])
    methanes = np.array([r.methane_ppm for r in data.readings])

    # Linear regression slope for methane rise rate (PPM / hr)
    if len(times) > 1 and (times[-1] - times[0]) > 0:
        methane_slope, _ = np.polyfit(times, methanes, 1)
    else:
        methane_slope = 0.0

    pressure_var = float(np.var(pressures))
    pressure_diff = float(np.max(pressures) - np.min(pressures))

    # Compaction is indicated when static air pressure in the bottom probe is elevated and tight
    is_compacted = pressure_diff < 4.0
    is_methane_surging = methane_slope >= 45.0 or (methanes[-1] > 300.0 and methane_slope > 20.0)

    # Risk score calculation
    risk_score = 0.0
    if is_compacted:
        risk_score += 40.0
    if methane_slope > 0:
        risk_score += min(50.0, methane_slope)
    if methanes[-1] > 250:
        risk_score += 10.0

    risk_score = float(np.clip(risk_score, 0.0, 100.0))
    risk_flag = is_compacted and is_methane_surging

    recommendation = (
        "CRITICAL: Anaerobic gas buildup detected in compacted bed. Turn and loosen compost within 24 hours to prevent foul odor release."
        if risk_flag
        else "Normal aeration level. No odor emission predicted for the next 24 hours."
    )

    return OdorPredictionOutput(
        odor_outbreak_risk=risk_flag,
        risk_score_pct=round(risk_score, 1),
        pressure_variance=round(pressure_var, 3),
        methane_slope_ppm_per_hr=round(float(methane_slope), 2),
        compaction_detected=is_compacted,
        advance_warning_hours=24,
        recommendation=recommendation
    )
