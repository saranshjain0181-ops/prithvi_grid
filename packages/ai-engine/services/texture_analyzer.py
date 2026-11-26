from pydantic import BaseModel
from typing import Optional
import numpy as np

class TextureAnalysisRequest(BaseModel):
    image_base64: Optional[str] = None
    r_mean: float = 85.0
    g_mean: float = 65.0
    b_mean: float = 40.0

class TextureAnalysisResponse(BaseModel):
    cured_humus_score_pct: float
    color_depth_index: float
    decomposition_stage: str
    weekly_video_ready: bool
    summary: str

def analyze_compost_texture(data: TextureAnalysisRequest) -> TextureAnalysisResponse:
    """
    Simulates computer-vision color depth analysis on OV2640 ESP32 camera images.
    High dark-brown/black organic matter ratio indicates rich cured humus.
    """
    luminosity = (0.299 * data.r_mean + 0.587 * data.g_mean + 0.114 * data.b_mean)
    brown_ratio = (data.r_mean - data.b_mean) / (data.r_mean + data.g_mean + data.b_mean + 1e-5)

    if luminosity < 100 and brown_ratio > 0.2:
        cured_score = min(98.0, max(60.0, (120 - luminosity) * 1.2))
        stage = "Cured Humus / Harvest Ready"
    elif luminosity > 140:
        cured_score = 30.0
        stage = "Fresh Raw Waste / Early Stage"
    else:
        cured_score = 65.0
        stage = "Active Decomposition Phase"

    return TextureAnalysisResponse(
        cured_humus_score_pct=round(cured_score, 1),
        color_depth_index=round(brown_ratio, 3),
        decomposition_stage=stage,
        weekly_video_ready=True,
        summary=f"Analyzed OV2640 frame. {stage} detected with {round(cured_score, 1)}% maturity index."
    )
