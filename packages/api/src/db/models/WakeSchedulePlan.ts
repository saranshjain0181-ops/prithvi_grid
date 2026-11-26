import { Schema, model, Document, Types } from 'mongoose';

export type AppointmentType = 'TASK' | 'RISK' | 'HOUSEKEEPING' | 'HEARTBEAT';

export interface IWakeAppointment {
  appointmentId: string;
  type: AppointmentType;
  scheduledTime: Date;
  durationSeconds: number;
  samplingDensity: 'MINIMAL' | 'STANDARD' | 'DENSE'; // 1 sample vs 4 samples vs 10 samples
  estimatedEnergyJoules: number;
  reason: string; // Plain-language reason
  status: 'SCHEDULED' | 'EXECUTED' | 'SKIPPED_LOW_ENERGY' | 'MISSED';
  executedAt?: Date;
  actualSupercapMv?: number;
}

export interface IWakeSchedulePlan extends Document {
  nodeId: Types.ObjectId;
  pitId: Types.ObjectId;
  facilityId: Types.ObjectId;
  scheduleDate: string; // YYYY-MM-DD
  version: number;
  dailyEnergyBudgetJoules: number;
  allocatedEnergyJoules: number;
  safetyReservePct: number; // e.g. 20%
  currentSupercapMv: number;
  forecastBrownoutRisk: 'LOW' | 'MODERATE' | 'HIGH';
  appointments: IWakeAppointment[];
  isActive: boolean;
  downlinkPayload: {
    scheduleVersion: number;
    appointmentsCompact: Array<{
      epoch: number;
      mode: number; // 0=HEARTBEAT, 1=STANDARD, 2=DENSE
      dur: number;
    }>;
  };
}

const WakeAppointmentSchema = new Schema<IWakeAppointment>({
  appointmentId: { type: String, required: true },
  type: {
    type: String,
    enum: ['TASK', 'RISK', 'HOUSEKEEPING', 'HEARTBEAT'],
    required: true,
  },
  scheduledTime: { type: Date, required: true },
  durationSeconds: { type: Number, default: 8 },
  samplingDensity: {
    type: String,
    enum: ['MINIMAL', 'STANDARD', 'DENSE'],
    default: 'STANDARD',
  },
  estimatedEnergyJoules: { type: Number, required: true },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ['SCHEDULED', 'EXECUTED', 'SKIPPED_LOW_ENERGY', 'MISSED'],
    default: 'SCHEDULED',
  },
  executedAt: { type: Date },
  actualSupercapMv: { type: Number },
}, { _id: false });

export const WakeSchedulePlanSchema = new Schema<IWakeSchedulePlan>({
  nodeId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, index: true },
  pitId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, index: true },
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
  scheduleDate: { type: String, required: true, index: true },
  version: { type: Number, default: 1 },
  dailyEnergyBudgetJoules: { type: Number, required: true },
  allocatedEnergyJoules: { type: Number, required: true },
  safetyReservePct: { type: Number, default: 20 },
  currentSupercapMv: { type: Number, required: true },
  forecastBrownoutRisk: {
    type: String,
    enum: ['LOW', 'MODERATE', 'HIGH'],
    default: 'LOW',
  },
  appointments: [WakeAppointmentSchema],
  isActive: { type: Boolean, default: true },
  downlinkPayload: {
    scheduleVersion: { type: Number, default: 1 },
    appointmentsCompact: [{
      epoch: { type: Number, required: true },
      mode: { type: Number, required: true },
      dur: { type: Number, required: true },
      _id: false,
    }],
  },
}, { timestamps: true });

WakeSchedulePlanSchema.index({ nodeId: 1, scheduleDate: 1 }, { unique: true });

export const WakeSchedulePlan = model<IWakeSchedulePlan>('WakeSchedulePlan', WakeSchedulePlanSchema);
