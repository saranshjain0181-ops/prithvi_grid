import mongoose, { Document, Schema } from 'mongoose';

export interface ISafetyLeadingIndicators {
  overdueCorrectiveActionsCount: number;
  nearMissToIncidentRatio: number; // healthy culture has >= 3 near misses per incident
  alarmDrillPassRatePct: number;
  daysSinceLastAlarmDrill: number;
  contractorSafetyCompliancePct: number;
  heatStressWarningDaysCount: number;
}

export interface ISafetyWelfareSnapshotRecord extends Document {
  snapshotId: string;
  facilityId: string;
  asOfDate: string; // YYYY-MM-DD
  safetyPostureStatus: 'HEALTHY' | 'ACTION_REQUIRED' | 'CRITICAL_HAZARD';
  totalIncidentsMonth: number;
  totalNearMissesMonth: number;
  leadingIndicators: ISafetyLeadingIndicators;
  openCorrectiveActionsCount: number;
  advisoryHindi: string;
  createdAt: Date;
}

const SafetyWelfareSnapshotSchema = new Schema<ISafetyWelfareSnapshotRecord>(
  {
    snapshotId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    asOfDate: { type: String, required: true, index: true },
    safetyPostureStatus: {
      type: String,
      required: true,
      enum: ['HEALTHY', 'ACTION_REQUIRED', 'CRITICAL_HAZARD'],
      default: 'HEALTHY',
    },
    totalIncidentsMonth: { type: Number, default: 0 },
    totalNearMissesMonth: { type: Number, default: 0 },
    leadingIndicators: {
      overdueCorrectiveActionsCount: { type: Number, default: 0 },
      nearMissToIncidentRatio: { type: Number, default: 3.0 },
      alarmDrillPassRatePct: { type: Number, default: 100 },
      daysSinceLastAlarmDrill: { type: Number, default: 7 },
      contractorSafetyCompliancePct: { type: Number, default: 95 },
      heatStressWarningDaysCount: { type: Number, default: 0 },
    },
    openCorrectiveActionsCount: { type: Number, default: 0 },
    advisoryHindi: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SafetyWelfareSnapshot = mongoose.model<ISafetyWelfareSnapshotRecord>(
  'SafetyWelfareSnapshot',
  SafetyWelfareSnapshotSchema
);
