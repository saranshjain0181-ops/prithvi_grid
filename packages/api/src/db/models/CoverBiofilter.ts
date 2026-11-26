import mongoose, { Document, Schema } from 'mongoose';

export type CoverStateType = 'OPEN' | 'COVERED' | 'PARTLY_COVERED';
export type CoverMaterialType = 'TARPAULIN' | 'SOIL_CAP' | 'DRY_LEAF_CAP' | 'BIOCHAR_CAP' | 'MECHANICAL_LID';

export interface ICoverStateRecord extends Document {
  pitId: string;
  facilityId: string;
  coverState: CoverStateType;
  coverType?: CoverMaterialType;
  exposureMinutes: number;
  maxAllowedOpenMinutes: number;
  isExposureExceeded: boolean;
  coverAssetCondition: 'GOOD' | 'WORN' | 'DAMAGED_NEEDS_REPLACEMENT';
  photoUrl?: string;
  updatedAt: Date;
}

const CoverStateSchema = new Schema<ICoverStateRecord>(
  {
    pitId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    coverState: {
      type: String,
      required: true,
      enum: ['OPEN', 'COVERED', 'PARTLY_COVERED'],
      default: 'COVERED',
    },
    coverType: {
      type: String,
      enum: ['TARPAULIN', 'SOIL_CAP', 'DRY_LEAF_CAP', 'BIOCHAR_CAP', 'MECHANICAL_LID'],
      default: 'TARPAULIN',
    },
    exposureMinutes: { type: Number, default: 0 },
    maxAllowedOpenMinutes: { type: Number, default: 120 },
    isExposureExceeded: { type: Boolean, default: false },
    coverAssetCondition: {
      type: String,
      enum: ['GOOD', 'WORN', 'DAMAGED_NEEDS_REPLACEMENT'],
      default: 'GOOD',
    },
    photoUrl: { type: String },
  },
  { timestamps: true }
);

export const CoverState = mongoose.model<ICoverStateRecord>('CoverState', CoverStateSchema);
