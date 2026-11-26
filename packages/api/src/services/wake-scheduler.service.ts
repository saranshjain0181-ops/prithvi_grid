import { Types } from 'mongoose';
import { WakeSchedulePlan, IWakeSchedulePlan, IWakeAppointment, AppointmentType } from '../db/models/WakeSchedulePlan';
import { PhysicalAsset } from '../db/models/PhysicalAsset';
import { UserAuthRoster } from '../db/models/UserAuthRoster';

export interface EnergyModelParams {
  currentSupercapMv: number; // e.g. 4850 mV
  tegDeltaTC: number; // Pit Temp minus Ambient Temp, e.g. 26°C
  forecastAmbientHighC?: number;
  forecastAmbientLowC?: number;
}

export interface DailyTaskSlot {
  taskName: string;
  workerName: string;
  expectedStartTime: Date; // e.g. 10:00 AM
  taskType: 'TURNING' | 'WATERING' | 'LOADING';
}

export const SMART_SPEAR_PHYSICAL_CONSTANTS = {
  EFFECTIVE_CAPACITANCE_FARADS: 12.5,
  V_MAX_SAFE_MV: 5400,
  V_CUTOFF_MV: 3200,
  V_TRANSMISSION_MIN_INTERLOCK_MV: 4000,
  ENERGY_COST_HEARTBEAT_JOULES: 6.5,
  ENERGY_COST_STANDARD_BURST_JOULES: 12.8,
  ENERGY_COST_DENSE_BURST_JOULES: 18.5,
  TEG_HARVEST_COEFF_JOULES_PER_DEGREE_HOUR: 0.32,
  SAFETY_RESERVE_RATIO: 0.20, // 20%
} as const;

/**
 * Calculates stored electrical energy inside dual series supercapacitors in Joules.
 * E = 0.5 * C_eff * (V^2 - V_cutoff^2)
 */
export function calculateUsableEnergyJoules(voltageMv: number): number {
  const c = SMART_SPEAR_PHYSICAL_CONSTANTS.EFFECTIVE_CAPACITANCE_FARADS;
  const vCutoff = SMART_SPEAR_PHYSICAL_CONSTANTS.V_CUTOFF_MV / 1000.0;
  const vCurrent = Math.max(vCutoff, voltageMv / 1000.0);

  const usableEnergy = 0.5 * c * (Math.pow(vCurrent, 2) - Math.pow(vCutoff, 2));
  return Number(Math.max(0, usableEnergy).toFixed(2));
}

/**
 * Estimates 24-hour thermal energy harvest based on TEG temperature differential.
 */
export function forecastDailyHarvestJoules(tegDeltaTC: number): number {
  const delta = Math.max(0, tegDeltaTC);
  const coeff = SMART_SPEAR_PHYSICAL_CONSTANTS.TEG_HARVEST_COEFF_JOULES_PER_DEGREE_HOUR;
  // 24 hours of operation
  return Number((delta * coeff * 24).toFixed(1));
}

export class WakeSchedulerService {
  /**
   * Plans and optimizes dynamic 24-hour wake appointments for a Smart Spear node.
   */
  public async planDailyWakeAppointments(params: {
    nodeId: string | Types.ObjectId;
    pitId: string | Types.ObjectId;
    facilityId: string | Types.ObjectId;
    scheduleDate: string; // YYYY-MM-DD
    energyParams: EnergyModelParams;
    rosteredTasks?: DailyTaskSlot[];
    hasRisingMethaneRisk?: boolean;
  }): Promise<IWakeSchedulePlan> {
    const nodeObjId = new Types.ObjectId(params.nodeId.toString());
    const pitObjId = new Types.ObjectId(params.pitId.toString());
    const facilityObjId = new Types.ObjectId(params.facilityId.toString());

    const { currentSupercapMv, tegDeltaTC } = params.energyParams;

    // 1. Calculate usable and forecasted energy budgets
    const storedEnergyJ = calculateUsableEnergyJoules(currentSupercapMv);
    const harvestEnergyJ = forecastDailyHarvestJoules(tegDeltaTC);
    const totalDailyEnergyJ = storedEnergyJ + harvestEnergyJ;

    // Reserve 20% safety margin
    const safetyReserveJ = totalDailyEnergyJ * SMART_SPEAR_PHYSICAL_CONSTANTS.SAFETY_RESERVE_RATIO;
    let availableBudgetJ = Math.max(0, totalDailyEnergyJ - safetyReserveJ);

    let brownoutRisk: IWakeSchedulePlan['forecastBrownoutRisk'] = 'LOW';
    if (currentSupercapMv < 3800) {
      brownoutRisk = 'HIGH';
    } else if (currentSupercapMv < SMART_SPEAR_PHYSICAL_CONSTANTS.V_TRANSMISSION_MIN_INTERLOCK_MV) {
      brownoutRisk = 'MODERATE';
    }

    const appointments: IWakeAppointment[] = [];
    let allocatedEnergyJ = 0;

    // Safety Interlock: Voltage below 4.0V forbids dense task appointments
    const isInterlockActive = currentSupercapMv < SMART_SPEAR_PHYSICAL_CONSTANTS.V_TRANSMISSION_MIN_INTERLOCK_MV;

    // 2. Schedule Task Appointments (from worker roster)
    if (params.rosteredTasks && params.rosteredTasks.length > 0 && !isInterlockActive) {
      for (let i = 0; i < params.rosteredTasks.length; i++) {
        const task = params.rosteredTasks[i];
        const cost = SMART_SPEAR_PHYSICAL_CONSTANTS.ENERGY_COST_DENSE_BURST_JOULES;

        if (availableBudgetJ >= cost) {
          availableBudgetJ -= cost;
          allocatedEnergyJ += cost;

          appointments.push({
            appointmentId: `task_app_${i + 1}`,
            type: 'TASK',
            scheduledTime: task.expectedStartTime,
            durationSeconds: 12,
            samplingDensity: 'DENSE',
            estimatedEnergyJoules: cost,
            reason: `Worker ${task.workerName} rostered for ${task.taskType}. Sampling pre/post turnaround.`,
            status: 'SCHEDULED',
          });
        }
      }
    }

    // 3. Schedule Risk Appointments (if methane or odor slope rising)
    if (params.hasRisingMethaneRisk && !isInterlockActive) {
      const riskCost = SMART_SPEAR_PHYSICAL_CONSTANTS.ENERGY_COST_STANDARD_BURST_JOULES;
      if (availableBudgetJ >= riskCost) {
        availableBudgetJ -= riskCost;
        allocatedEnergyJ += riskCost;

        const riskTime = new Date(Date.now() + 45 * 60 * 1000); // 45 mins from now
        appointments.push({
          appointmentId: `risk_app_ch4_${Date.now()}`,
          type: 'RISK',
          scheduledTime: riskTime,
          durationSeconds: 8,
          samplingDensity: 'STANDARD',
          estimatedEnergyJoules: riskCost,
          reason: 'Methane rising slope detected. Dense intermediate check scheduled.',
          status: 'SCHEDULED',
        });
      }
    }

    // 4. Fill baseline Heartbeat appointments (2 to 4 hours interval based on remaining budget)
    const heartbeatCost = SMART_SPEAR_PHYSICAL_CONSTANTS.ENERGY_COST_HEARTBEAT_JOULES;
    const baseIntervalHours = isInterlockActive ? 4 : 2; // Expand sleep interval if voltage low
    const baseDate = new Date(`${params.scheduleDate}T00:00:00.000Z`);

    for (let hour = 0; hour < 24; hour += baseIntervalHours) {
      const hbTime = new Date(baseDate.getTime() + hour * 3600 * 1000);
      const isOverlapping = appointments.some(
        (a) => Math.abs(a.scheduledTime.getTime() - hbTime.getTime()) < 30 * 60 * 1000
      );

      if (!isOverlapping && availableBudgetJ >= heartbeatCost) {
        availableBudgetJ -= heartbeatCost;
        allocatedEnergyJ += heartbeatCost;

        appointments.push({
          appointmentId: `hb_app_${hour}`,
          type: 'HEARTBEAT',
          scheduledTime: hbTime,
          durationSeconds: 5,
          samplingDensity: 'MINIMAL',
          estimatedEnergyJoules: heartbeatCost,
          reason: 'Periodic thermal gradient check and telemetry heartbeat.',
          status: 'SCHEDULED',
        });
      }
    }

    // Sort appointments chronologically
    appointments.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

    // 5. Generate Compact Downlink Payload for ESP32 Flash
    const compactList = appointments.map((a) => {
      let mode = 0; // HEARTBEAT
      if (a.samplingDensity === 'STANDARD') mode = 1;
      if (a.samplingDensity === 'DENSE') mode = 2;

      return {
        epoch: Math.floor(a.scheduledTime.getTime() / 1000),
        mode,
        dur: a.durationSeconds,
      };
    });

    // 6. Save or update plan
    const planDoc = await WakeSchedulePlan.findOneAndUpdate(
      {
        nodeId: nodeObjId,
        scheduleDate: params.scheduleDate,
      },
      {
        pitId: pitObjId,
        facilityId: facilityObjId,
        dailyEnergyBudgetJoules: Number(totalDailyEnergyJ.toFixed(1)),
        allocatedEnergyJoules: Number(allocatedEnergyJ.toFixed(1)),
        safetyReservePct: SMART_SPEAR_PHYSICAL_CONSTANTS.SAFETY_RESERVE_RATIO * 100,
        currentSupercapMv,
        forecastBrownoutRisk: brownoutRisk,
        appointments,
        isActive: true,
        downlinkPayload: {
          scheduleVersion: Date.now(),
          appointmentsCompact: compactList,
        },
      },
      { upsert: true, new: true }
    );

    return planDoc;
  }
}

export const wakeSchedulerService = new WakeSchedulerService();
