import mongoose, { Document, Schema } from 'mongoose';

export type EvidenceCategory =
  | 'TEMPERATURE_STABILITY'
  | 'DEGREE_DAYS'
  | 'PH_STABILIZATION'
  | 'VISUAL_COLOUR_INDEX'
  | 'SENSE_CHECK_OBSERVATION'
  | 'GERMINATION_CRESS_TEST'
  | 'LAB_CN_RATIO';

export interface IMaturityEvidenceItem {
  category: EvidenceCategory;
  scoreContributionPct: number; // 0-100
  reliabilityWeight: number; // 0.1 to 1.0
  observedValue: string;
  isPassed: boolean;
  notes?: string;
}

export interface IMaturityFusionRecord extends Document {
  recordId: string;
  batchId: string;
  facilityId: string;
  evidenceItems: IMaturityEvidenceItem[];
  compositeMaturityScorePct: number;
  evidenceStrengthTier: 'STRONG' | 'MODERATE' | 'WEAK';
  harvestWindow: {
    earliestHarvestDate: string; // YYYY-MM-DD
    likelyHarvestDate: string;
    latestHarvestDate: string;
    confidencePct: number;
  };
  isReadyForRelease: boolean;
  releaseDecisionNotes?: string;
  decidedByManagerId?: string;
  createdAt: Date;
}

const MaturityFusionSchema = new Schema<IMaturityFusionRecord>(
  {
    recordId: { type: String, required: true, unique: true, index: true },
    batchId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    evidenceItems: [
      {
        category: { type: String, required: true },
        scoreContributionPct: { type: Number, required: true },
        reliabilityWeight: { type: Number, required: true },
        observedValue: { type: String, required: true },
        isPassed: { type: Boolean, required: true },
        notes: { type: String },
      },
    ],
    compositeMaturityScorePct: { type: Number, required: true },
    evidenceStrengthTier: {
      type: String,
      required: true,
      enum: ['STRONG', 'MODERATE', 'WEAK'],
      default: 'MODERATE',
    },
    harvestWindow: {
      earliestHarvestDate: { type: String, required: true },
      likelyHarvestDate: { type: String, required: true },
      latestHarvestDate: { type: String, required: true },
      confidencePct: { type: Number, required: true },
    },
    isReadyForRelease: { type: Boolean, default: false },
    releaseDecisionNotes: { type: String },
    decidedByManagerId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const MaturityFusion = mongoose.model<IMaturityFusionRecord>('MaturityFusion', MaturityFusionSchema);
