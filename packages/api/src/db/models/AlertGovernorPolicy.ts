import { Schema, model, Document, Types } from 'mongoose';

export interface IAlertGovernorPolicy extends Document {
  tenantId: Types.ObjectId;
  facilityId?: Types.ObjectId;
  maxInterruptiveAlertsPerDay: {
    BWG_MANAGER: number; // default: 8
    SAFAI_MITRA: number; // default: 4
    SUPREME_HEAD: number; // default: 12
  };
  digestDeliveryHourUtc: number; // e.g. 17 (5 PM UTC / 10:30 PM IST)
  suppressedAlertsLog: Array<{
    alertId: Types.ObjectId;
    pitId: Types.ObjectId;
    suppressionReason: 'BUDGET_EXCEEDED' | 'DUPLICATE_MERGED' | 'MOVED_TO_DIGEST' | 'LOW_SEVERITY_DAMPENED';
    suppressedAt: Date;
    bypassedForCritical: boolean;
  }>;
  silentFailureWatches: Array<{
    watchType: 'MISSING_DAILY_INTAKE' | 'MISSING_TURNING' | 'CELL_TOWER_SILENCE';
    lastActivityAt: Date;
    expectedFrequencyHours: number;
    alertRaised: boolean;
    alertRaisedAt?: Date;
  }>;
}

export const AlertGovernorPolicySchema = new Schema<IAlertGovernorPolicy>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation' },
  maxInterruptiveAlertsPerDay: {
    BWG_MANAGER: { type: Number, default: 8 },
    SAFAI_MITRA: { type: Number, default: 4 },
    SUPREME_HEAD: { type: Number, default: 12 },
  },
  digestDeliveryHourUtc: { type: Number, default: 17 },
  suppressedAlertsLog: [{
    alertId: { type: Schema.Types.ObjectId, ref: 'AiAlertSanjivani', required: true },
    pitId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true },
    suppressionReason: {
      type: String,
      enum: ['BUDGET_EXCEEDED', 'DUPLICATE_MERGED', 'MOVED_TO_DIGEST', 'LOW_SEVERITY_DAMPENED'],
      required: true,
    },
    suppressedAt: { type: Date, default: Date.now },
    bypassedForCritical: { type: Boolean, default: false },
    _id: false,
  }],
  silentFailureWatches: [{
    watchType: {
      type: String,
      enum: ['MISSING_DAILY_INTAKE', 'MISSING_TURNING', 'CELL_TOWER_SILENCE'],
      required: true,
    },
    lastActivityAt: { type: Date, required: true },
    expectedFrequencyHours: { type: Number, required: true },
    alertRaised: { type: Boolean, default: false },
    alertRaisedAt: { type: Date },
    _id: false,
  }],
}, { timestamps: true });

export const AlertGovernorPolicy = model<IAlertGovernorPolicy>('AlertGovernorPolicy', AlertGovernorPolicySchema);
