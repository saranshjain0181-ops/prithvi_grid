import { Schema, model, Document, Types } from 'mongoose';

export interface IPublicImpactBadge extends Document {
  facilityId: Types.ObjectId;
  entityId: Types.ObjectId;
  slug: string; // e.g. "radisson-blu-indore"
  isPubliclyVisible: boolean;
  totalWasteDivertedKg: number;
  totalCompostHarvestedKg: number;
  estimatedCo2eAvoidedMt: number;
  latestSealHash: string;
  evidenceStrengthTier: 'STRONG' | 'MODERATE' | 'WEAK';
  badgeStatus: 'ACTIVE_VERIFIED' | 'DATA_STALE_PENDING' | 'REVOKED';
  embedCode: string;
  lastTelemetryReceivedAt: Date;
}

export const PublicImpactBadgeSchema = new Schema<IPublicImpactBadge>({
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, unique: true, index: true },
  entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
  slug: { type: String, required: true, unique: true },
  isPubliclyVisible: { type: Boolean, default: true },
  totalWasteDivertedKg: { type: Number, default: 0 },
  totalCompostHarvestedKg: { type: Number, default: 0 },
  estimatedCo2eAvoidedMt: { type: Number, default: 0 },
  latestSealHash: { type: String, required: true },
  evidenceStrengthTier: {
    type: String,
    enum: ['STRONG', 'MODERATE', 'WEAK'],
    default: 'STRONG',
  },
  badgeStatus: {
    type: String,
    enum: ['ACTIVE_VERIFIED', 'DATA_STALE_PENDING', 'REVOKED'],
    default: 'ACTIVE_VERIFIED',
  },
  embedCode: { type: String, required: true },
  lastTelemetryReceivedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const PublicImpactBadge = model<IPublicImpactBadge>('PublicImpactBadge', PublicImpactBadgeSchema);
