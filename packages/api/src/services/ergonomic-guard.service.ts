import { HeatStressCategory } from '../db/models/ErgonomicGuard.js';

export interface TaskLoadInput {
  taskType: 'TURNING' | 'FEEDING_SHOVELING' | 'WHEELBARROW_HAUL' | 'INSPECTION_LIGHT';
  durationMinutes: number;
}

export interface ErgonomicShiftEvaluation {
  totalPhysicalLoadUnits: number;
  maxLoadThreshold: number;
  isLoadExceeded: boolean;
  heatStressIndex: number;
  heatCategory: HeatStressCategory;
  mandatoryRestMinutesPerHour: number;
  workSuspensionMandated: boolean;
  workerAdvice: string;
}

const LOAD_UNITS_PER_HOUR: Record<string, number> = {
  TURNING: 50,
  FEEDING_SHOVELING: 30,
  WHEELBARROW_HAUL: 20,
  INSPECTION_LIGHT: 5,
};

export class ErgonomicGuardService {
  /**
   * Deterministically calculates Heat Index / WBGT from ambient temp (°C) and humidity (%)
   * Simplified Rothfusz regression equation for heat index in degrees Celsius.
   */
  calculateHeatStressIndex(ambientTempC: number, relativeHumidityPct: number): number {
    const T = ambientTempC;
    const R = relativeHumidityPct;
    // Approximated Heat Index formula in Celsius
    const HI = -8.78469475556 +
      1.61139411 * T +
      2.33854883889 * R -
      0.14611605 * T * R -
      0.012308094 * T * T -
      0.0164248277778 * R * R +
      0.002211732 * T * T * R +
      0.00072546 * T * R * R -
      0.000003582 * T * T * R * R;
    return Math.round(Math.max(T, HI) * 10) / 10;
  }

  /**
   * Evaluates worker's cumulative physical workload and heat stress conditions
   */
  evaluateShiftWelfare(params: {
    tasks: TaskLoadInput[];
    ambientTempC: number;
    relativeHumidityPct: number;
    maxShiftLoadUnits?: number; // default 120 PLU per shift
  }): ErgonomicShiftEvaluation {
    const maxLoadThreshold = params.maxShiftLoadUnits ?? 120;
    let totalPhysicalLoadUnits = 0;

    for (const task of params.tasks) {
      const ratePerHour = LOAD_UNITS_PER_HOUR[task.taskType] ?? 10;
      totalPhysicalLoadUnits += (task.durationMinutes / 60) * ratePerHour;
    }
    totalPhysicalLoadUnits = Math.round(totalPhysicalLoadUnits * 10) / 10;

    const heatStressIndex = this.calculateHeatStressIndex(params.ambientTempC, params.relativeHumidityPct);

    let heatCategory: HeatStressCategory = 'LOW';
    let mandatoryRestMinutesPerHour = 0;
    let workSuspensionMandated = false;

    if (heatStressIndex >= 44.0) {
      heatCategory = 'DANGER';
      mandatoryRestMinutesPerHour = 45; // 45 min rest per 15 min work
      workSuspensionMandated = true;
    } else if (heatStressIndex >= 38.0) {
      heatCategory = 'EXTREME_CAUTION';
      mandatoryRestMinutesPerHour = 20; // 20 min shade & ORS hydration rest
    } else if (heatStressIndex >= 32.0) {
      heatCategory = 'CAUTION';
      mandatoryRestMinutesPerHour = 10;
    } else {
      heatCategory = 'LOW';
      mandatoryRestMinutesPerHour = 0;
    }

    const isLoadExceeded = totalPhysicalLoadUnits > maxLoadThreshold;

    let workerAdvice = '';
    if (workSuspensionMandated) {
      workerAdvice = '[CRITICAL-HEAT-STRESS] अत्यधिक गर्मी (हीट इंडेक्स >44°C)। भारी शारीरिक काम तुरंत रोकें और छाया में ओआरएस (ORS) घोल पिएँ। [NEEDS-NATIVE-REVIEW]';
    } else if (isLoadExceeded) {
      workerAdvice = `शिफ्ट का शारीरिक कार्य भार (${totalPhysicalLoadUnits} PLU) अनुशंसित सीमा (${maxLoadThreshold} PLU) से अधिक हो गया है। आज के लिए अन्य कार्य किसी अन्य साथी को सौंपें। [NEEDS-NATIVE-REVIEW]`;
    } else if (mandatoryRestMinutesPerHour > 0) {
      workerAdvice = `गर्मी का प्रभाव मध्यम है। प्रति घंटे कम से कम ${mandatoryRestMinutesPerHour} मिनट छाया में आराम और पानी का सेवन अनिवार्य है। [NEEDS-NATIVE-REVIEW]`;
    } else {
      workerAdvice = 'कार्य भार और तापमान सामान्य सीमा में हैं। [NEEDS-NATIVE-REVIEW]';
    }

    return {
      totalPhysicalLoadUnits,
      maxLoadThreshold,
      isLoadExceeded,
      heatStressIndex,
      heatCategory,
      mandatoryRestMinutesPerHour,
      workSuspensionMandated,
      workerAdvice,
    };
  }
}

export const ergonomicGuardService = new ErgonomicGuardService();
