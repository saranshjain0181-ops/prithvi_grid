import mongoose, { Document, Schema } from 'mongoose';

export interface IImageQualityGateResult {
  isUsable: boolean;
  blurScore: number; // 0-1
  brightnessScore: number; // 0-1
  isFoggedOrFouled: boolean;
  referencePatchDetected: boolean;
  rejectionReason?: string;
}

export interface IVisualMaturityRecord extends Document {
  frameId: string;
  pitId: string;
  batchId: string;
  capturedAt: Date;
  qualityGate: IImageQualityGateResult;
  rawDarknessScore: number; // 0-100
  moistureAdjustmentPenalty: number;
  calibratedMaturityIndex: number; // 0-100
  confidencePct: number;
  timeLapseSequenceNumber?: number;
  createdAt: Date;
}

const VisualMaturitySchema = new Schema<IVisualMaturityRecord>(
  {
    frameId: { type: String, required: true, unique: true, index: true },
    pitId: { type: String, required: true, index: true },
    batchId: { type: String, required: true, index: true },
    capturedAt: { type: Date, required: true },
    qualityGate: {
      isUsable: { type: Boolean, required: true },
      blurScore: { type: Number, required: true },
      brightnessScore: { type: Number, required: true },
      isFoggedOrFouled: { type: Boolean, default: false },
      referencePatchDetected: { type: Boolean, default: true },
      rejectionReason: { type: String },
    },
    rawDarknessScore: { type: Number, required: true },
    moistureAdjustmentPenalty: { type: Number, default: 0 },
    calibratedMaturityIndex: { type: Number, required: true },
    confidencePct: { type: Number, required: true },
    timeLapseSequenceNumber: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const VisualMaturity = mongoose.model<IVisualMaturityRecord>('VisualMaturity', VisualMaturitySchema);
