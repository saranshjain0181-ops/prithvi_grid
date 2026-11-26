import mongoose, { Document, Schema } from 'mongoose';

export type StatutoryAuthority = 'MUNICIPAL_CORPORATION' | 'STATE_POLLUTION_CONTROL_BOARD' | 'CPCB_CENTRAL';

export interface IRegisterLineItem {
  fieldCode: string;
  fieldLabel: string;
  sourceLedger: string;
  compiledValue: string;
  isAutofilled: boolean;
  evidenceStrength: 'STRONG' | 'MODERATE' | 'WEAK';
}

export interface ICompiledReturnRecord extends Document {
  returnId: string;
  facilityId: string;
  reportingPeriodMonth: string; // YYYY-MM
  authority: StatutoryAuthority;
  templateVersion: string;
  totalFieldsCount: number;
  autofilledFieldsCount: number;
  autofillCompletenessPct: number;
  missingDataGapsCount: number;
  isAttestedByManager: boolean;
  attestedByUserId?: string;
  attestedAt?: Date;
  submissionStatus: 'DRAFT_PENDING_REVIEW' | 'ATTESTED_SEALED' | 'SUBMITTED_TO_PORTAL';
  submissionReceiptRef?: string;
  createdAt: Date;
}

const CompiledReturnSchema = new Schema<ICompiledReturnRecord>(
  {
    returnId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    reportingPeriodMonth: { type: String, required: true, index: true },
    authority: {
      type: String,
      required: true,
      enum: ['MUNICIPAL_CORPORATION', 'STATE_POLLUTION_CONTROL_BOARD', 'CPCB_CENTRAL'],
    },
    templateVersion: { type: String, required: true },
    totalFieldsCount: { type: Number, required: true },
    autofilledFieldsCount: { type: Number, required: true },
    autofillCompletenessPct: { type: Number, required: true },
    missingDataGapsCount: { type: Number, default: 0 },
    isAttestedByManager: { type: Boolean, default: false },
    attestedByUserId: { type: String },
    attestedAt: { type: Date },
    submissionStatus: {
      type: String,
      required: true,
      enum: ['DRAFT_PENDING_REVIEW', 'ATTESTED_SEALED', 'SUBMITTED_TO_PORTAL'],
      default: 'DRAFT_PENDING_REVIEW',
    },
    submissionReceiptRef: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const CompiledReturn = mongoose.model<ICompiledReturnRecord>(
  'CompiledReturn',
  CompiledReturnSchema
);
