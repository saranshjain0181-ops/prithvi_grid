import mongoose, { Document, Schema } from 'mongoose';

export type PestPressureTier = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface IPestInspection extends Document {
  inspectionId: string;
  entityId: string;
  facilityId: string;
  inspectorId: string;
  inspectionDate: string; // YYYY-MM-DD
  stickyTrapFliesCount: number;
  pestObservations: string[]; // e.g. ['MAGGOTS_CORE', 'RODENT_BURROWS', 'STRAY_ANIMALS', 'COCKROACHES', 'ANT_COLONIES']
  pestPressureIndex: number;  // 0 - 100
  pressureTier: PestPressureTier;
  actionTaken?: string;
  bioApprovedPesticideUsed?: string; // e.g. 'Neem Oil Spray 2%', 'Bacillus thuringiensis'
  vendorVisitLogged: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PestControlSchema = new Schema<IPestInspection>(
  {
    inspectionId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    inspectorId: { type: String, required: true },
    inspectionDate: { type: String, required: true, index: true },
    stickyTrapFliesCount: { type: Number, default: 0 },
    pestObservations: [{ type: String }],
    pestPressureIndex: { type: Number, required: true },
    pressureTier: {
      type: String,
      required: true,
      enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'],
      default: 'LOW',
      index: true,
    },
    actionTaken: { type: String },
    bioApprovedPesticideUsed: { type: String },
    vendorVisitLogged: { type: Boolean, default: false },
    notes: { type: String },
  },
  { timestamps: true }
);

PestControlSchema.index({ facilityId: 1, inspectionDate: -1 });

export const PestControl = mongoose.model<IPestInspection>('PestControl', PestControlSchema);
