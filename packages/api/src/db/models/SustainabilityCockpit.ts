import mongoose, { Document, Schema } from 'mongoose';

export interface IClaimsRegisterItem {
  claimId: string;
  claimHeadline: string;
  metricValue: string;
  evidenceStrengthTier: 'STRONG' | 'MODERATE' | 'WEAK';
  isPublicMarketingPermitted: boolean;
  methodologySource: string;
}

export interface ISustainabilitySnapshotRecord extends Document {
  snapshotId: string;
  facilityId: string;
  asOfDate: string; // YYYY-MM-DD
  landfillDivertedMassMt: number;
  avoidedMethaneEmissionsMt: number; // 62.5 kg CH4 per MT
  netCarbonAbatementMtCo2e: number;
  waterRecycledLiters: number;
  measuredProvenancePct: number;
  claimsRegister: IClaimsRegisterItem[];
  annualTargetCommitmentPct: number;
  assurancePackageHashSha256: string;
  createdAt: Date;
}

const SustainabilitySnapshotSchema = new Schema<ISustainabilitySnapshotRecord>(
  {
    snapshotId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    asOfDate: { type: String, required: true, index: true },
    landfillDivertedMassMt: { type: Number, required: true },
    avoidedMethaneEmissionsMt: { type: Number, required: true },
    netCarbonAbatementMtCo2e: { type: Number, required: true },
    waterRecycledLiters: { type: Number, default: 0 },
    measuredProvenancePct: { type: Number, required: true },
    claimsRegister: [
      {
        claimId: { type: String, required: true },
        claimHeadline: { type: String, required: true },
        metricValue: { type: String, required: true },
        evidenceStrengthTier: { type: String, required: true },
        isPublicMarketingPermitted: { type: Boolean, required: true },
        methodologySource: { type: String, required: true },
      },
    ],
    annualTargetCommitmentPct: { type: Number, required: true },
    assurancePackageHashSha256: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SustainabilitySnapshot = mongoose.model<ISustainabilitySnapshotRecord>(
  'SustainabilitySnapshot',
  SustainabilitySnapshotSchema
);
