import mongoose, { Document, Schema } from 'mongoose';

export type SeasonType = 'MONSOON' | 'PEAK_SUMMER' | 'WINTER' | 'NORMAL';

export interface IChecklistItem {
  itemId: string;
  category: 'DRAINAGE' | 'COVERS' | 'FIRE_SAFETY' | 'MOISTURE' | 'INSULATION';
  title: string;
  isMandatory: boolean;
  status: 'PENDING' | 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
}

export interface ISeasonalReadinessAuditRecord extends Document {
  auditId: string;
  facilityId: string;
  season: SeasonType;
  year: number;
  readinessScorePct: number;
  items: IChecklistItem[];
  isClearedForSeason: boolean;
  auditorId: string;
  signedOffAt?: Date;
  createdAt: Date;
}

const SeasonalReadinessAuditSchema = new Schema<ISeasonalReadinessAuditRecord>(
  {
    auditId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    season: {
      type: String,
      required: true,
      enum: ['MONSOON', 'PEAK_SUMMER', 'WINTER', 'NORMAL'],
    },
    year: { type: Number, required: true },
    readinessScorePct: { type: Number, required: true },
    items: [
      {
        itemId: { type: String, required: true },
        category: { type: String, required: true },
        title: { type: String, required: true },
        isMandatory: { type: Boolean, default: true },
        status: {
          type: String,
          required: true,
          enum: ['PENDING', 'PASS', 'FAIL', 'NOT_APPLICABLE'],
          default: 'PENDING',
        },
        verifiedBy: { type: String },
        verifiedAt: { type: Date },
        notes: { type: String },
      },
    ],
    isClearedForSeason: { type: Boolean, default: false },
    auditorId: { type: String, required: true },
    signedOffAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SeasonalReadinessAudit = mongoose.model<ISeasonalReadinessAuditRecord>(
  'SeasonalReadinessAudit',
  SeasonalReadinessAuditSchema
);
