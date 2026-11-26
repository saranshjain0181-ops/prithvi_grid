import mongoose, { Document, Schema } from 'mongoose';

export type AlertFeedbackRating = 'KAAM_KA_THA' | 'ZAROORI_NAHI' | 'DER_SE_AAYA';

export interface IRuleQualityStat {
  ruleCode: string;
  ruleName: string;
  totalAlertsDispatched: number;
  usefulFeedbackCount: number;
  falseAlarmCount: number;
  delayedCount: number;
  precisionPct: number;
  averageLeadTimeHours: number;
  attentionCostPoints: number;
}

export interface ITuningProposal {
  proposalId: string;
  ruleCode: string;
  currentThreshold: string;
  proposedThreshold: string;
  currentDebounceMinutes: number;
  proposedDebounceMinutes: number;
  backtestEstimatedNoiseReductionPct: number;
  backtestMissedIncidentsCount: number;
  status: 'PENDING_AGRONOMIST_REVIEW' | 'IN_SHADOW_MODE' | 'ADOPTED' | 'REJECTED';
}

export interface IAlertQualitySnapshotRecord extends Document {
  snapshotId: string;
  facilityId: string;
  asOfDate: string; // YYYY-MM-DD
  overallAlertPrecisionPct: number;
  rulesEvaluated: IRuleQualityStat[];
  activeProposals: ITuningProposal[];
  createdAt: Date;
}

const AlertQualitySnapshotSchema = new Schema<IAlertQualitySnapshotRecord>(
  {
    snapshotId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    asOfDate: { type: String, required: true, index: true },
    overallAlertPrecisionPct: { type: Number, required: true },
    rulesEvaluated: [
      {
        ruleCode: { type: String, required: true },
        ruleName: { type: String, required: true },
        totalAlertsDispatched: { type: Number, required: true },
        usefulFeedbackCount: { type: Number, required: true },
        falseAlarmCount: { type: Number, required: true },
        delayedCount: { type: Number, required: true },
        precisionPct: { type: Number, required: true },
        averageLeadTimeHours: { type: Number, required: true },
        attentionCostPoints: { type: Number, required: true },
      },
    ],
    activeProposals: [
      {
        proposalId: { type: String, required: true },
        ruleCode: { type: String, required: true },
        currentThreshold: { type: String, required: true },
        proposedThreshold: { type: String, required: true },
        currentDebounceMinutes: { type: Number, required: true },
        proposedDebounceMinutes: { type: Number, required: true },
        backtestEstimatedNoiseReductionPct: { type: Number, required: true },
        backtestMissedIncidentsCount: { type: Number, required: true },
        status: { type: String, required: true },
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AlertQualitySnapshot = mongoose.model<IAlertQualitySnapshotRecord>(
  'AlertQualitySnapshot',
  AlertQualitySnapshotSchema
);
