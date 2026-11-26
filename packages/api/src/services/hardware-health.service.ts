export interface HardwareTelemetryInput {
  supercapMv?: number; // e.g. 5000 mV (nominal 5.4V down to 3.2V)
  vDropBurstMv?: number; // Voltage drop during 2A modem burst, e.g. 150 mV
  tegDeltaTC?: number; // Pit Temp minus Ambient Temp, e.g. 25°C
  harvestMv?: number; // Millivolts produced by LTC3108 TEG harvester
  signalRssi?: number; // e.g. -75 dBm
  consecutiveErrors?: number;
  resetCount?: number;
}

export interface HardwareHealthAssessment {
  healthScorePct: number; // 0 to 100
  voltageMv: number;
  vDropBurstMv: number;
  tegDeltaTC: number;
  harvestEfficiencyPct: number;
  estimatedEsrMilliOhms: number;
  brownoutRisk: 'LOW' | 'MODERATE' | 'CRITICAL';
  recommendations: string[];
  requiresTechnicianDispatch: boolean;
}

const PEAK_MODEM_BURST_CURRENT_AMPS = 2.0; // SIMCom A7670C Cat-1 transmit burst

/**
 * Evaluates hardware health and supercapacitor status for battery-less Smart Spear nodes
 */
export function assessHardwareHealth(input: HardwareTelemetryInput): HardwareHealthAssessment {
  const voltageMv = input.supercapMv ?? 4900;
  const vDropBurstMv = input.vDropBurstMv ?? 150;
  const tegDeltaTC = input.tegDeltaTC ?? 22;
  const harvestMv = input.harvestMv ?? 350;
  const signalRssi = input.signalRssi ?? -75;
  const consecutiveErrors = input.consecutiveErrors ?? 0;

  // 1. Estimate Equivalent Series Resistance (ESR)
  // ESR = deltaV / I_burst (millivolts / amps = milliohms)
  const estimatedEsrMilliOhms = Math.round(vDropBurstMv / PEAK_MODEM_BURST_CURRENT_AMPS);

  // 2. Assess Supercapacitor Voltage Health (35% weight)
  // Nominal operating range: 3400 mV to 5400 mV
  let voltageScore = 100;
  if (voltageMv >= 4800) {
    voltageScore = 100;
  } else if (voltageMv >= 4000) {
    voltageScore = 80 + ((voltageMv - 4000) / 800) * 20;
  } else if (voltageMv >= 3400) {
    voltageScore = 40 + ((voltageMv - 3400) / 600) * 40;
  } else {
    voltageScore = Math.max(0, ((voltageMv - 3000) / 400) * 40);
  }

  // 3. Assess Burst Stability & ESR Health (35% weight)
  // Healthy: vDrop <= 200mV (ESR <= 100 mOhm)
  // Moderate: 200mV < vDrop <= 450mV (ESR <= 225 mOhm)
  // Critical: vDrop > 450mV
  let esrScore = 100;
  if (vDropBurstMv <= 200) {
    esrScore = 100;
  } else if (vDropBurstMv <= 350) {
    esrScore = 75;
  } else if (vDropBurstMv <= 450) {
    esrScore = 50;
  } else {
    esrScore = Math.max(10, 100 - (vDropBurstMv - 200) * 0.25);
  }

  // 4. Assess TEG Thermal Harvester Coupling (15% weight)
  // Expected harvest output: at least 10mV per 1°C differential
  const expectedHarvestMv = Math.max(100, tegDeltaTC * 15);
  const harvestEfficiencyPct = Math.min(
    100,
    Math.round((harvestMv / Math.max(1, expectedHarvestMv)) * 100)
  );

  let tegScore = 100;
  if (harvestEfficiencyPct >= 70) {
    tegScore = 100;
  } else if (harvestEfficiencyPct >= 40) {
    tegScore = 70;
  } else {
    tegScore = 30;
  }

  // 5. Assess Signal & Error Health (15% weight)
  let commsScore = 100;
  if (signalRssi < -95) {
    commsScore -= 40;
  } else if (signalRssi < -85) {
    commsScore -= 20;
  }
  commsScore -= Math.min(50, consecutiveErrors * 15);
  commsScore = Math.max(0, commsScore);

  // Composite weighted score
  const rawHealthScore =
    voltageScore * 0.35 + esrScore * 0.35 + tegScore * 0.15 + commsScore * 0.15;
  const healthScorePct = Math.max(0, Math.min(100, Math.round(rawHealthScore)));

  // Brownout Risk Determination
  let brownoutRisk: 'LOW' | 'MODERATE' | 'CRITICAL' = 'LOW';
  if (voltageMv < 3400 || vDropBurstMv > 450 || healthScorePct < 40) {
    brownoutRisk = 'CRITICAL';
  } else if (voltageMv < 4100 || vDropBurstMv > 280 || healthScorePct < 65) {
    brownoutRisk = 'MODERATE';
  }

  // Recommendations and technician dispatch triggers
  const recommendations: string[] = [];
  let requiresTechnicianDispatch = false;

  if (vDropBurstMv > 450) {
    recommendations.push(
      `High supercapacitor internal resistance (ESR: ${estimatedEsrMilliOhms} mΩ). Schedule dual-supercapacitor module replacement.`
    );
    requiresTechnicianDispatch = true;
  }

  if (tegDeltaTC >= 20 && harvestEfficiencyPct < 40) {
    recommendations.push(
      `Thermal energy disconnect: Pit is hot (ΔT: ${tegDeltaTC}°C) but LTC3108 harvester is underproducing (${harvestMv}mV). Clean heatsink fins and reapply thermal paste.`
    );
    requiresTechnicianDispatch = true;
  }

  if (voltageMv < 3400) {
    recommendations.push(
      `Imminent brownout warning (${voltageMv}mV remaining). Recommend extending sleep duty cycle from 2h to 4h until pit thermophilic heat increases.`
    );
  }

  if (signalRssi < -95) {
    recommendations.push(
      `Marginal 4G Cat-1 signal (${signalRssi} dBm). Consider repositioning node external antenna or elevating junction box.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Supercapacitor charge retention and TEG harvester operating optimally.');
  }

  return {
    healthScorePct,
    voltageMv,
    vDropBurstMv,
    tegDeltaTC,
    harvestEfficiencyPct,
    estimatedEsrMilliOhms,
    brownoutRisk,
    recommendations,
    requiresTechnicianDispatch,
  };
}
