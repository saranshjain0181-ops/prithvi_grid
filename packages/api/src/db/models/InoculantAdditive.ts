import mongoose, { Document, Schema } from 'mongoose';

export type AdditiveType =
  | 'EM1_MICROBIAL'
  | 'TRICHODERMA_HARZIANUM'
  | 'COW_DUNG_STARTER'
  | 'AGRICULTURAL_LIME'
  | 'BIOCHAR'
  | 'WOOD_ASH';

export interface IInoculantApplicationRecord extends Document {
  applicationId: string;
  facilityId: string;
  pitId: string;
  additiveType: AdditiveType;
  dosageGramsPerTon: number;
  totalQuantityAppliedGrams: number;
  appliedBy: string;
  activationHoursPrior: number; // e.g. 48h molasses fermentation
  isCultureActive: boolean;
  isTrial: boolean;
  trialArm?: 'TREATED' | 'CONTROL';
  trialMetricBaselineTempC?: number;
  notes?: string;
  createdAt: Date;
}

const InoculantApplicationSchema = new Schema<IInoculantApplicationRecord>(
  {
    applicationId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    pitId: { type: String, required: true, index: true },
    additiveType: {
      type: String,
      required: true,
      enum: [
        'EM1_MICROBIAL',
        'TRICHODERMA_HARZIANUM',
        'COW_DUNG_STARTER',
        'AGRICULTURAL_LIME',
        'BIOCHAR',
        'WOOD_ASH',
      ],
    },
    dosageGramsPerTon: { type: Number, required: true },
    totalQuantityAppliedGrams: { type: Number, required: true },
    appliedBy: { type: String, required: true },
    activationHoursPrior: { type: Number, default: 0 },
    isCultureActive: { type: Boolean, default: true },
    isTrial: { type: Boolean, default: false },
    trialArm: { type: String, enum: ['TREATED', 'CONTROL'] },
    trialMetricBaselineTempC: { type: Number },
    notes: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const InoculantApplication = mongoose.model<IInoculantApplicationRecord>(
  'InoculantApplication',
  InoculantApplicationSchema
);
