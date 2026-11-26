import mongoose, { Document, Schema } from 'mongoose';

export type SopCategory =
  | 'TURNING'
  | 'WATERING'
  | 'BIO_INOCULUM'
  | 'SCREENING'
  | 'SAFETY_PPE'
  | 'ODOR_CONTROL';

export interface ISopStep {
  stepIndex: number;
  title: string;
  description: string;
  criticalSafetyNote?: string;
  photoGuidanceUrl?: string;
  estimatedMinutes: number;
}

export interface ISopDocument extends Document {
  sopId: string;
  entityId: string;
  title: string;
  category: SopCategory;
  version: number;
  purpose: string;
  scope: string;
  steps: ISopStep[];
  status: 'DRAFT' | 'ACTIVE' | 'SUPERSEDED';
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SopStudioSchema = new Schema<ISopDocument>(
  {
    sopId: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['TURNING', 'WATERING', 'BIO_INOCULUM', 'SCREENING', 'SAFETY_PPE', 'ODOR_CONTROL'],
      index: true,
    },
    version: { type: Number, required: true, default: 1 },
    purpose: { type: String, required: true },
    scope: { type: String, required: true },
    steps: [
      {
        stepIndex: { type: Number, required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        criticalSafetyNote: { type: String },
        photoGuidanceUrl: { type: String },
        estimatedMinutes: { type: Number, default: 5 },
      },
    ],
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'ACTIVE', 'SUPERSEDED'],
      default: 'DRAFT',
      index: true,
    },
    approvedBy: { type: String },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

SopStudioSchema.index({ entityId: 1, category: 1, version: -1 });

export const SopStudio = mongoose.model<ISopDocument>('SopStudio', SopStudioSchema);
