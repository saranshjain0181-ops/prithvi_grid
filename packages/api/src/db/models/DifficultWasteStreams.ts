import mongoose, { Document, Schema } from 'mongoose';

export type DifficultStreamType =
  | 'TENDER_COCONUT_SHELLS'
  | 'BANANA_STEMS_FIBER'
  | 'TEMPLE_FESTIVAL_FLOWERS'
  | 'CITRUS_ONION_PEEL'
  | 'PICKLES_BRINE'
  | 'COOKED_RICE_DAL'
  | 'DAIRY_RESIDUES';

export interface IStreamRule {
  streamType: DifficultStreamType;
  maxSharePct: number; // max % of total load mass
  preTreatmentsRequired: string[];
  riskCategory: 'ACID_CRASH' | 'SALT_TOXICITY' | 'ODOR_FLIES' | 'SLOW_DECAY' | 'EQUIPMENT_JAM';
  instructionHindi: string;
}

export interface IDifficultStreamBatchRecord extends Document {
  recordId: string;
  facilityId: string;
  pitId: string;
  loadMassKg: number;
  streamShares: Array<{
    streamType: DifficultStreamType;
    massKg: number;
    sharePct: number;
    isLimitBreached: boolean;
  }>;
  isFestivalSurgeActive: boolean;
  festivalName?: string;
  mitigationsApplied: string[];
  createdAt: Date;
}

const DifficultStreamBatchSchema = new Schema<IDifficultStreamBatchRecord>(
  {
    recordId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    pitId: { type: String, required: true, index: true },
    loadMassKg: { type: Number, required: true },
    streamShares: [
      {
        streamType: { type: String, required: true },
        massKg: { type: Number, required: true },
        sharePct: { type: Number, required: true },
        isLimitBreached: { type: Boolean, default: false },
      },
    ],
    isFestivalSurgeActive: { type: Boolean, default: false },
    festivalName: { type: String },
    mitigationsApplied: [{ type: String }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const DifficultStreamBatch = mongoose.model<IDifficultStreamBatchRecord>(
  'DifficultStreamBatch',
  DifficultStreamBatchSchema
);
