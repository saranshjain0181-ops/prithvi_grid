import mongoose, { Document, Schema } from 'mongoose';

export type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ICorrectionRequest extends Document {
  requestId: string;
  entityId: string;
  facilityId: string;
  targetCollection: string; // e.g. 'LabourExecutionLedger', 'KhadKachraFlow'
  targetRecordId: string;
  fieldName: string;
  originalValue: any;
  proposedValue: any;
  reason: string;
  makerUserId: string;
  checkerUserId?: string;
  status: CorrectionStatus;
  rejectionReason?: string;
  reviewedAt?: Date;
  version: number;
  auditHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const CorrectionRequestSchema = new Schema<ICorrectionRequest>(
  {
    requestId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    targetCollection: { type: String, required: true, index: true },
    targetRecordId: { type: String, required: true, index: true },
    fieldName: { type: String, required: true },
    originalValue: { type: Schema.Types.Mixed, required: true },
    proposedValue: { type: Schema.Types.Mixed, required: true },
    reason: { type: String, required: true },
    makerUserId: { type: String, required: true, index: true },
    checkerUserId: { type: String, index: true },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    rejectionReason: { type: String },
    reviewedAt: { type: Date },
    version: { type: Number, default: 1 },
    auditHash: { type: String, required: true },
  },
  { timestamps: true }
);

CorrectionRequestSchema.index({ facilityId: 1, status: 1, createdAt: -1 });

export const CorrectionRequest = mongoose.model<ICorrectionRequest>(
  'CorrectionRequest',
  CorrectionRequestSchema
);
