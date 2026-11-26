import { Schema, model, Document, Types } from 'mongoose';

export type ComplianceStatus = 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'REVISED';
export type ReportingPeriod = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

export interface IComplianceRequirement {
  code: string;
  title: string;
  clause: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'INCONCLUSIVE' | 'EXEMPT';
  evidenceSummary: string;
  telemetryEvidence?: Record<string, any>;
}

export interface ISwmComplianceArchive extends Document {
  entityId: Types.ObjectId;
  facilityId: Types.ObjectId;
  generatedBy: Types.ObjectId;     // ref: UserAuthRoster
  reportingPeriod: ReportingPeriod;
  periodStart: Date;
  periodEnd: Date;
  status: ComplianceStatus;
  certificateId: string;
  certificateHash: string;
  previousCertificateHash: string;
  tamperProofSignature?: string;
  regulationRef?: string;
  requirementsCatalog: IComplianceRequirement[];
  summary: {
    totalWasteInKg: number;
    totalFertilizerOutKg: number;
    totalRejectKg: number;
    avgTempC: number;
    thermophilicHours: number;
    avgMoisturePct: number;
    avgPh: number;
    maxMethanePpm: number;
    totalAlerts: number;
    criticalAlerts: number;
    labourTasksTotal: number;
    labourVerifiedGenuine: number;
    labourFakeFlagged: number;
    violationsPrevented: number;
  };
  financialEstimates: {
    fineSlabInr: number;
    finesPreventedInr: number;
    compostPricePerKg: number;
    compostValueInr: number;
    tippingFeePerMt: number;
    landfillHaulingSavingsInr: number;
    totalEstimatedSavingsInr: number;
    carbonOffsetKg: number;
    isEstimated: boolean;
    legalDisclaimer: string;
  };
  pdfUrl?: string;
  pdfGeneratedAt?: Date;
  submittedAt?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceRequirementSchema = new Schema<IComplianceRequirement>(
  {
    code: { type: String, required: true },
    title: { type: String, required: true },
    clause: { type: String, required: true },
    status: {
      type: String,
      enum: ['COMPLIANT', 'NON_COMPLIANT', 'INCONCLUSIVE', 'EXEMPT'],
      default: 'COMPLIANT',
    },
    evidenceSummary: { type: String, required: true },
    telemetryEvidence: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const SwmComplianceArchiveSchema = new Schema<ISwmComplianceArchive>(
  {
    entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
    facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster', required: true },
    reportingPeriod: {
      type: String,
      enum: ['MONTHLY', 'QUARTERLY', 'ANNUAL'],
      required: true,
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'REVISED'],
      default: 'SUBMITTED',
      index: true,
    },
    certificateId: { type: String, required: true, unique: true },
    certificateHash: { type: String, required: true },
    previousCertificateHash: { type: String, required: true, default: 'GENESIS_BLOCK_00000000000000000000000000000000' },
    tamperProofSignature: { type: String },
    regulationRef: { type: String, default: 'SWM-2016-Rule-4 / Indore-IMC-Byelaws-2026' },
    requirementsCatalog: [ComplianceRequirementSchema],
    summary: {
      totalWasteInKg: { type: Number, default: 0 },
      totalFertilizerOutKg: { type: Number, default: 0 },
      totalRejectKg: { type: Number, default: 0 },
      avgTempC: { type: Number, default: 0 },
      thermophilicHours: { type: Number, default: 0 },
      avgMoisturePct: { type: Number, default: 0 },
      avgPh: { type: Number, default: 0 },
      maxMethanePpm: { type: Number, default: 0 },
      totalAlerts: { type: Number, default: 0 },
      criticalAlerts: { type: Number, default: 0 },
      labourTasksTotal: { type: Number, default: 0 },
      labourVerifiedGenuine: { type: Number, default: 0 },
      labourFakeFlagged: { type: Number, default: 0 },
      violationsPrevented: { type: Number, default: 0 },
    },
    financialEstimates: {
      fineSlabInr: { type: Number, default: 5000 },
      finesPreventedInr: { type: Number, default: 0 },
      compostPricePerKg: { type: Number, default: 5 },
      compostValueInr: { type: Number, default: 0 },
      tippingFeePerMt: { type: Number, default: 1500 },
      landfillHaulingSavingsInr: { type: Number, default: 0 },
      totalEstimatedSavingsInr: { type: Number, default: 0 },
      carbonOffsetKg: { type: Number, default: 0 },
      isEstimated: { type: Boolean, default: true },
      legalDisclaimer: {
        type: String,
        default: 'Financial savings are estimates based on client-configured penalty slabs under local municipal bylaws (IMC / SWM 2016 Rule 4). All figures are derived from immutable sensor telemetry and work execution ledgers.',
      },
    },
    pdfUrl: { type: String },
    pdfGeneratedAt: { type: Date },
    submittedAt: { type: Date, default: Date.now },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
  },
  { timestamps: true }
);

SwmComplianceArchiveSchema.index({ facilityId: 1, periodStart: -1 });
SwmComplianceArchiveSchema.index({ entityId: 1, status: 1 });
SwmComplianceArchiveSchema.index({ facilityId: 1, reportingPeriod: 1, periodStart: -1 });
SwmComplianceArchiveSchema.index({ certificateHash: 1 }, { unique: true });

export const SwmComplianceArchive = model<ISwmComplianceArchive>(
  'SwmComplianceArchive',
  SwmComplianceArchiveSchema
);
