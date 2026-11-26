import mongoose, { Document, Schema } from 'mongoose';

export interface IMassBalanceFlow extends Document {
  flowId: string;
  entityId: string;
  facilityId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  // Inputs (Measured)
  wetWasteIntakeKg: number;
  bulkingAddedKg: number;
  waterAddedKg: number;
  totalMassInputKg: number;
  // Outputs & Discharges (Measured)
  fineCompostProducedKg: number;
  oversizeRejectsRecycledKg: number;
  nonCompostableRejectsLandfilledKg: number;
  leachateDischargedKg: number;
  // Process Losses (Honest Estimates)
  evaporationLossKg: number;
  carbonDioxideLossKg: number;
  totalAccountedOutputKg: number;
  // Reconciliation Metrics
  massImbalanceKg: number;
  imbalancePercentage: number;
  status: 'RECONCILED' | 'VARIANCE_ALERT';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MassBalanceFlowSchema = new Schema<IMassBalanceFlow>(
  {
    flowId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    periodStart: { type: String, required: true, index: true },
    periodEnd: { type: String, required: true, index: true },
    wetWasteIntakeKg: { type: Number, required: true },
    bulkingAddedKg: { type: Number, required: true },
    waterAddedKg: { type: Number, required: true, default: 0 },
    totalMassInputKg: { type: Number, required: true },
    fineCompostProducedKg: { type: Number, required: true },
    oversizeRejectsRecycledKg: { type: Number, required: true },
    nonCompostableRejectsLandfilledKg: { type: Number, required: true, default: 0 },
    leachateDischargedKg: { type: Number, required: true, default: 0 },
    evaporationLossKg: { type: Number, required: true },
    carbonDioxideLossKg: { type: Number, required: true },
    totalAccountedOutputKg: { type: Number, required: true },
    massImbalanceKg: { type: Number, required: true },
    imbalancePercentage: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ['RECONCILED', 'VARIANCE_ALERT'],
      default: 'RECONCILED',
      index: true,
    },
    notes: { type: String },
  },
  { timestamps: true }
);

MassBalanceFlowSchema.index({ facilityId: 1, periodStart: -1 });

export const MassBalanceFlow = mongoose.model<IMassBalanceFlow>(
  'MassBalanceFlow',
  MassBalanceFlowSchema
);
