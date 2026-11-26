import mongoose, { Document, Schema } from 'mongoose';

export interface IInstrumentHealthItem {
  instrumentId: string;
  type: 'SMART_SPEAR' | 'WEIGH_SCALE' | 'PROBE_THERMOMETER' | 'CONDUCTIVITY_METER' | 'PH_PROBE';
  isCalibrated: boolean;
  daysUntilCalibrationDue: number;
  trustScorePct: number;
}

export interface ITrustRemediationAction {
  actionId: string;
  costTier: 'ZERO_COST' | 'LOW_EFFORT' | 'TECHNICIAN_VISIT';
  expectedTrustScoreGainPct: number;
  descriptionHindi: string;
}

export interface IDataTrustSnapshotRecord extends Document {
  snapshotId: string;
  facilityId: string;
  asOfDate: string; // YYYY-MM-DD
  compositeTrustIndexPct: number; // 0-100
  trustTier: 'STRONG' | 'MODERATE' | 'WEAK';
  components: {
    instrumentsScore: number;
    coverageScore: number;
    corroborationScore: number;
    imageQualityScore: number;
    provenanceMeasuredPct: number;
    freshnessScore: number;
  };
  topThreeRemediations: ITrustRemediationAction[];
  createdAt: Date;
}

const DataTrustSnapshotSchema = new Schema<IDataTrustSnapshotRecord>(
  {
    snapshotId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    asOfDate: { type: String, required: true, index: true },
    compositeTrustIndexPct: { type: Number, required: true },
    trustTier: {
      type: String,
      required: true,
      enum: ['STRONG', 'MODERATE', 'WEAK'],
      default: 'MODERATE',
    },
    components: {
      instrumentsScore: { type: Number, required: true },
      coverageScore: { type: Number, required: true },
      corroborationScore: { type: Number, required: true },
      imageQualityScore: { type: Number, required: true },
      provenanceMeasuredPct: { type: Number, required: true },
      freshnessScore: { type: Number, required: true },
    },
    topThreeRemediations: [
      {
        actionId: { type: String, required: true },
        costTier: { type: String, required: true },
        expectedTrustScoreGainPct: { type: Number, required: true },
        descriptionHindi: { type: String, required: true },
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const DataTrustSnapshot = mongoose.model<IDataTrustSnapshotRecord>(
  'DataTrustSnapshot',
  DataTrustSnapshotSchema
);
