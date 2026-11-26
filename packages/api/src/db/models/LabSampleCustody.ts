import mongoose, { Document, Schema } from 'mongoose';

export type CompostGrade = 'GRADE_A_FCO_PREMIUM' | 'GRADE_B_LANDSCAPE' | 'GRADE_FAIL';

export interface ILabParameters {
  moisturePercent: number;        // FCO: < 25%
  organicCarbonPercent: number;   // FCO: > 12%
  totalNitrogenPercent: number;   // FCO: > 0.8%
  totalPhosphorusP2O5Percent: number; // FCO: > 0.4%
  totalPotassiumK2OPercent: number;   // FCO: > 0.4%
  carbonNitrogenRatio: number;    // FCO: < 20:1
  phValue: number;                // FCO: 6.5 - 7.5
  electricalConductivityDsPerM: number; // FCO: < 4.0 dS/m
  heavyMetalsSafe: boolean;       // Pb, Cd, Cr, Ni within statutory limits
}

export interface ILabSampleCustody extends Document {
  sampleId: string;
  entityId: string;
  facilityId: string;
  batchId: string;
  curePileId?: string;
  sampledBy: string;
  sampleDate: Date;
  labName: string;
  labAccreditationNumber?: string; // NABL accredited laboratory ID
  testReportNumber?: string;
  reportDate?: Date;
  parameters?: ILabParameters;
  assignedGrade: CompostGrade;
  status: 'SAMPLE_DISPATCHED' | 'REPORT_RECEIVED' | 'VERIFIED';
  verifiedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LabSampleCustodySchema = new Schema<ILabSampleCustody>(
  {
    sampleId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    batchId: { type: String, required: true, index: true },
    curePileId: { type: String },
    sampledBy: { type: String, required: true },
    sampleDate: { type: Date, required: true, default: Date.now },
    labName: { type: String, required: true },
    labAccreditationNumber: { type: String },
    testReportNumber: { type: String },
    reportDate: { type: Date },
    parameters: {
      moisturePercent: { type: Number },
      organicCarbonPercent: { type: Number },
      totalNitrogenPercent: { type: Number },
      totalPhosphorusP2O5Percent: { type: Number },
      totalPotassiumK2OPercent: { type: Number },
      carbonNitrogenRatio: { type: Number },
      phValue: { type: Number },
      electricalConductivityDsPerM: { type: Number },
      heavyMetalsSafe: { type: Boolean, default: true },
    },
    assignedGrade: {
      type: String,
      required: true,
      enum: ['GRADE_A_FCO_PREMIUM', 'GRADE_B_LANDSCAPE', 'GRADE_FAIL'],
      default: 'GRADE_B_LANDSCAPE',
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['SAMPLE_DISPATCHED', 'REPORT_RECEIVED', 'VERIFIED'],
      default: 'SAMPLE_DISPATCHED',
    },
    verifiedBy: { type: String },
  },
  { timestamps: true }
);

LabSampleCustodySchema.index({ facilityId: 1, batchId: 1 });

export const LabSampleCustody = mongoose.model<ILabSampleCustody>(
  'LabSampleCustody',
  LabSampleCustodySchema
);
