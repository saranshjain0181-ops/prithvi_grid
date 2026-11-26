import mongoose, { Document, Schema } from 'mongoose';

export type CostCategory =
  | 'LABOUR_INTERNAL'
  | 'LABOUR_CONTRACTOR'
  | 'BULKING_MATERIAL'
  | 'INOCULANT_ADDITIVES'
  | 'WATER_SUPPLY'
  | 'ENERGY_ELECTRICITY'
  | 'EQUIPMENT_MAINTENANCE'
  | 'LAB_TESTING'
  | 'SUBSCRIPTION';

export interface IStageCostAllocation {
  stage: 'RECEIVING' | 'PREPARATION' | 'COMPOSTING' | 'CURING' | 'FINISHING';
  allocatedCostInr: number;
  costPerKgInr: number;
}

export interface IOperatingCostLedgerRecord extends Document {
  ledgerId: string;
  facilityId: string;
  tenantId: string;
  periodMonth: string; // YYYY-MM
  totalCostInr: number;
  budgetInr: number;
  varianceInr: number;
  variancePercentage: number;
  costPerKgProcessedInr: number;
  stageAllocations: IStageCostAllocation[];
  crashCostInr: number;
  contaminationCostInr: number;
  createdAt: Date;
  updatedAt: Date;
}

const OperatingCostLedgerSchema = new Schema<IOperatingCostLedgerRecord>(
  {
    ledgerId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    periodMonth: { type: String, required: true, index: true },
    totalCostInr: { type: Number, required: true },
    budgetInr: { type: Number, required: true },
    varianceInr: { type: Number, required: true },
    variancePercentage: { type: Number, required: true },
    costPerKgProcessedInr: { type: Number, required: true },
    stageAllocations: [
      {
        stage: {
          type: String,
          required: true,
          enum: ['RECEIVING', 'PREPARATION', 'COMPOSTING', 'CURING', 'FINISHING'],
        },
        allocatedCostInr: { type: Number, required: true },
        costPerKgInr: { type: Number, required: true },
      },
    ],
    crashCostInr: { type: Number, default: 0 },
    contaminationCostInr: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const OperatingCostLedger = mongoose.model<IOperatingCostLedgerRecord>(
  'OperatingCostLedger',
  OperatingCostLedgerSchema
);
