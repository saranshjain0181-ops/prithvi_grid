import mongoose, { Document, Schema } from 'mongoose';

export interface IBiologicalBenchmark {
  metricKey: string;
  metricName: string;
  fleetAverage: number;
  benchmarkTarget: number;
  unit: string;
  status: 'EXCELLENT' | 'NORMAL' | 'SUB_OPTIMAL';
}

export interface IAgronomyReviewQueueItem {
  reviewId: string;
  facilityId: string;
  pitId: string;
  eventType: 'ACID_CRASH' | 'PROLONGED_MESOPHILIC' | 'EXCESS_MOISTURE' | 'NITROGEN_LEACHING';
  severity: 'WARNING' | 'CRITICAL';
  detectedAt: Date;
  suggestedIntervention: string;
  status: 'PENDING_REVIEW' | 'REVIEWED_RECOMMENDED' | 'DISMISSED';
  reviewedBy?: string;
}

export interface IAgronomyCockpitSnapshotRecord extends Document {
  snapshotId: string;
  asOfDate: string; // YYYY-MM-DD
  benchmarks: IBiologicalBenchmark[];
  reviewQueue: IAgronomyReviewQueueItem[];
  activeTrialsCount: number;
  createdAt: Date;
}

const AgronomyCockpitSnapshotSchema = new Schema<IAgronomyCockpitSnapshotRecord>(
  {
    snapshotId: { type: String, required: true, unique: true, index: true },
    asOfDate: { type: String, required: true, index: true },
    benchmarks: [
      {
        metricKey: { type: String, required: true },
        metricName: { type: String, required: true },
        fleetAverage: { type: Number, required: true },
        benchmarkTarget: { type: Number, required: true },
        unit: { type: String, required: true },
        status: { type: String, required: true, enum: ['EXCELLENT', 'NORMAL', 'SUB_OPTIMAL'] },
      },
    ],
    reviewQueue: [
      {
        reviewId: { type: String, required: true },
        facilityId: { type: String, required: true },
        pitId: { type: String, required: true },
        eventType: { type: String, required: true },
        severity: { type: String, required: true, enum: ['WARNING', 'CRITICAL'] },
        detectedAt: { type: Date, required: true },
        suggestedIntervention: { type: String, required: true },
        status: {
          type: String,
          required: true,
          enum: ['PENDING_REVIEW', 'REVIEWED_RECOMMENDED', 'DISMISSED'],
          default: 'PENDING_REVIEW',
        },
        reviewedBy: { type: String },
      },
    ],
    activeTrialsCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AgronomyCockpitSnapshot = mongoose.model<IAgronomyCockpitSnapshotRecord>(
  'AgronomyCockpitSnapshot',
  AgronomyCockpitSnapshotSchema
);
