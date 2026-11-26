from pydantic import BaseModel
from typing import List

class TelemetrySnapshot(BaseModel):
    temp_c: float
    moisture_pct: float
    pressure_hpa: float

class VarianceCheckRequest(BaseModel):
    action_type: str
    reading_before: TelemetrySnapshot
    reading_after: TelemetrySnapshot

class VarianceCheckResponse(BaseModel):
    is_genuine: bool
    status: str
    delta_temp: float
    delta_moisture: float
    delta_pressure: float
    confidence_score_pct: float
    reason: str

def evaluate_sensor_variance(data: VarianceCheckRequest) -> VarianceCheckResponse:
    dt = abs(data.reading_after.temp_c - data.reading_before.temp_c)
    dm = abs(data.reading_after.moisture_pct - data.reading_before.moisture_pct)
    dp = abs(data.reading_after.pressure_hpa - data.reading_before.pressure_hpa)

    is_genuine = False
    confidence = 0.0

    if "PAANI" in data.action_type or "WATER" in data.action_type:
        if dm >= 2.0 or dt >= 1.0:
            is_genuine = True
            confidence = min(99.0, 50.0 + dm * 10)
    elif "GHUMAYA" in data.action_type or "TURN" in data.action_type or "HAWA" in data.action_type:
        if dp >= 0.5 or dt >= 1.0:
            is_genuine = True
            confidence = min(99.0, 60.0 + dp * 20)
    else:
        if dt >= 1.0 or dm >= 2.0 or dp >= 0.5:
            is_genuine = True
            confidence = 80.0

    if not is_genuine:
        status = "FAKE_FLAG"
        confidence = 15.0
        reason = "Flatline detected: Thermodynamic and moisture values remained unchanged after 15 minutes."
    else:
        status = "VERIFIED_GENUINE"
        reason = f"Physical perturbation confirmed (ΔT={round(dt,1)}°C, ΔM={round(dm,1)}%, ΔP={round(dp,1)}hPa)."

    return VarianceCheckResponse(
        is_genuine=is_genuine,
        status=status,
        delta_temp=round(dt, 2),
        delta_moisture=round(dm, 2),
        delta_pressure=round(dp, 2),
        confidence_score_pct=round(confidence, 1),
        reason=reason
    )
