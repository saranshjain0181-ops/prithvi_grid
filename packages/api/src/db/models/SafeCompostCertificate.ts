import { Schema, model, Document, Types } from 'mongoose';

export interface ISafeCompostCertificate extends Document {
  batchId: Types.ObjectId;
  facilityId: Types.ObjectId;
  certificateNumber: string; // e.g. "COMPOST-CERT-2026-IND-082"
  consecutiveHoursAbove55C: number; // Sanitization standard: >= 72 hours
  turningsCountDuringHotPhase: number; // e.g. >= 2 turnings
  peakTempC: number;
  curingDurationDays: number; // Curing period: >= 21 days
  finalMoisturePct: number;
  finalPh: number;
  criteriaVerdict: 'CRITERIA_MET' | 'CRITERIA_NOT_MET' | 'INSUFFICIENT_EVIDENCE';
  evidenceStrengthTier: 'STRONG' | 'MODERATE' | 'WEAK';
  merkleSealRootHash: string;
  disclaimer: string;
  issuedAt: Date;
}

const CERTIFICATE_LEGAL_DISCLAIMER =
  '[LEGAL-REVIEW]: Verified agro-industrial thermal process record under SWM-2016 composting operating parameters. This certificate confirms time-and-temperature pathogen and weed-seed exposure within measured probe radii. It does not replace independent laboratory NPK, heavy-metal, or bio-assay testing.';

export const SafeCompostCertificateSchema = new Schema<ISafeCompostCertificate>({
  batchId: { type: Schema.Types.ObjectId, ref: 'CompostBatch', required: true, index: true },
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
  certificateNumber: { type: String, required: true, unique: true },
  consecutiveHoursAbove55C: { type: Number, required: true },
  turningsCountDuringHotPhase: { type: Number, required: true },
  peakTempC: { type: Number, required: true },
  curingDurationDays: { type: Number, required: true },
  finalMoisturePct: { type: Number, required: true },
  finalPh: { type: Number, required: true },
  criteriaVerdict: {
    type: String,
    enum: ['CRITERIA_MET', 'CRITERIA_NOT_MET', 'INSUFFICIENT_EVIDENCE'],
    required: true,
  },
  evidenceStrengthTier: {
    type: String,
    enum: ['STRONG', 'MODERATE', 'WEAK'],
    default: 'STRONG',
  },
  merkleSealRootHash: { type: String, required: true },
  disclaimer: { type: String, default: CERTIFICATE_LEGAL_DISCLAIMER },
  issuedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const SafeCompostCertificate = model<ISafeCompostCertificate>('SafeCompostCertificate', SafeCompostCertificateSchema);
