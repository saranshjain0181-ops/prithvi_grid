from pydantic import BaseModel
from typing import List, Optional

class TelemetryInput(BaseModel):
    temp_c: float
    ph: float
    moisture_pct: float
    methane_ppm: float
    stage_days: int = 14
    pit_volume_kg: float = 1000.0

class RecipeResponse(BaseModel):
    is_emergency: bool
    status_label_hi: str
    status_label_en: str
    carbon_supplement_kg: float
    microbial_booster_liters: float
    aeration_minutes: int
    instructions_hi: List[str]
    instructions_en: List[str]
    voice_script_hi: str
    voice_script_en: str

def optimize_sanjivani_recipe(data: TelemetryInput) -> RecipeResponse:
    """
    Biological Compost Sanjivani Optimizer.
    Evaluates acid-crash, cold stall, and moisture imbalances to formulate
    exact microbial and carbon recovery recipes.
    """
    is_acid_crash = data.ph < 5.2
    is_cold_stall = data.temp_c < 40.0
    is_anaerobic = data.methane_ppm > 300.0
    is_overwet = data.moisture_pct > 65.0
    is_dry = data.moisture_pct < 35.0

    if is_acid_crash and is_cold_stall:
        # Critical biological stall
        dry_leaves_kg = round(data.pit_volume_kg * 0.02, 1)  # 2% carbon dry matter
        jaggery_water_l = round(data.pit_volume_kg * 0.005, 1) # 0.5% microbial booster
        return RecipeResponse(
            is_emergency=True,
            status_label_hi="🔴 संजीवनी आपातकालीन स्थिति (Acid Crash & Cold Stall)",
            status_label_en="CRITICAL_ACID_CRASH_COLD_STALL",
            carbon_supplement_kg=dry_leaves_kg,
            microbial_booster_liters=jaggery_water_l,
            aeration_minutes=20,
            instructions_hi=[
                f"{dry_leaves_kg} किलो सूखे पत्ते या लकड़ी का बुरादा डालें (C:N संतुलन हेतु)।",
                f"{jaggery_water_l} लीटर गुड़ का पानी छिड़कें (सक्रिय जीवाणु पोषण)।",
                "कचरे को ऊपर से नीचे 20 मिनट तक अच्छी तरह पलटें (गहन वातन)।",
                "अगले 48 घंटे तक नया गीला कचरा न डालें।",
            ],
            instructions_en=[
                f"Incorporate {dry_leaves_kg} kg dry brown leaves / sawdust to neutralize organic acids.",
                f"Spray {jaggery_water_l} L lukewarm jaggery microbial inoculant evenly.",
                "Turn compost bed thoroughly for 20 minutes for aeration.",
                "Halt fresh wet waste loading for 48 hours.",
            ],
            voice_script_hi=f"सावधान! कंपोस्ट में एसिड क्रैश हो गया है। तुरंत {dry_leaves_kg} किलो सूखे पत्ते और गुड़ का पानी डालकर कचरा पलटें।",
            voice_script_en=f"Emergency: Acid crash detected. Add {dry_leaves_kg} kg dry leaves and aerate bed immediately."
        )

    if is_anaerobic:
        return RecipeResponse(
            is_emergency=False,
            status_label_hi="🟡 अवायवीय मीथेन वृद्धि (Kachra Ghumao)",
            status_label_en="ANAEROBIC_METHANE_SURGE",
            carbon_supplement_kg=10.0,
            microbial_booster_liters=0.0,
            aeration_minutes=15,
            instructions_hi=[
                "कचरे को अच्छी तरह पलटकर हवा दें (ऑक्सीजन संचार)।",
                "5 किलो नीम पाउडर या सूखी मिट्टी छिड़कें।",
            ],
            instructions_en=[
                "Turn and loosen compost heap to restore aerobic microbial pathways.",
                "Dust 5 kg dry soil or neem cake powder to absorb odor.",
            ],
            voice_script_hi="मीथेन गैस बढ़ रही है, कृपया गड्ढे का कचरा घुमाकर हवा दें।",
            voice_script_en="Methane rising. Please turn compost for aeration."
        )

    if is_dry:
        water_needed = round(data.pit_volume_kg * 0.03, 1)
        return RecipeResponse(
            is_emergency=False,
            status_label_hi="🔵 नमी की कमी (Paani Chhidko)",
            status_label_en="MOISTURE_DEFICIT",
            carbon_supplement_kg=0.0,
            microbial_booster_liters=water_needed,
            aeration_minutes=10,
            instructions_hi=[
                f"नमी 35% से कम है। लगभग {water_needed} लीटर पानी समान रूप से छिड़कें।",
                "पानी डालने के बाद हल्के हाथ से कचरा मिलाएं।",
            ],
            instructions_en=[
                f"Moisture deficit detected. Spray {water_needed} L water across surface.",
                "Mix gently after hydration.",
            ],
            voice_script_hi=f"कचरा सूख रहा है, कृपया {water_needed} लीटर पानी छिड़कें।",
            voice_script_en=f"Compost moisture is low. Please spray {water_needed} liters of water."
        )

    return RecipeResponse(
        is_emergency=False,
        status_label_hi="🟢 सब ठीक है (Healthy Biome)",
        status_label_en="OPTIMAL_THERMOPHILIC",
        carbon_supplement_kg=0.0,
        microbial_booster_liters=0.0,
        aeration_minutes=5,
        instructions_hi=["कंपोस्ट सामान्य दर से परिपक्व हो रहा है। नियमित दैनिक निगरानी रखें।"],
        instructions_en=["Biological decomposition proceeding at optimal thermophilic rate."],
        voice_script_hi="सब ठीक है, कंपोस्ट तापमान और नमी उत्तम है।",
        voice_script_en="All systems optimal. Compost condition is healthy."
    )
