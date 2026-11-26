import { Schema, model, Document, Types } from 'mongoose';

export type CompostBatchStage =
  | 'INPUT_ACCUMULATION'
  | 'THERMOPHILIC_ACTIVE'
  | 'CURING'
  | 'LAB_CERTIFIED'
  | 'HARVESTED'
  | 'DISTRIBUTED';

export interface ILabCertificate {
  certificateNumber: string;
  nitrogenPct: number;
  phosphorusPct: number;
  potassiumPct: number;
  cnRatio: number;
  ph: number;
  moisturePct: number;
  heavyMetalsPassed: boolean;
  certifiedAt: Date;
  labTechnician: string;
}

export interface IEsgCarbonOffset {
  methaneDiversionKg: number;
  co2EquivalentMt: number;
  esgRegistryStandard: string;
}

export interface ICommercialValuation {
  ratePerKgInr: number;
  totalValueInr: number;
  buyerOrganization?: string;
  invoiceNumber?: string;
}

export interface ICompostBatch extends Document {
  batchCode: string;
  entityId: Types.ObjectId;
  facilityId: Types.ObjectId;
  boxId: Types.ObjectId;
  startedAt: Date;
  harvestedAt?: Date;
  initialWasteWeightKg: number;
  curedCompostWeightKg: number;
  volumeReductionPct: number;
  stage: CompostBatchStage;
  labCertificate?: ILabCertificate;
  esgCarbonOffset: IEsgCarbonOffset;
  commercialValuation: ICommercialValuation;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CompostBatchSchema = new Schema<ICompostBatch>(
  {
    batchCode: { type: String, required: true, unique: true, trim: true },
    entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
    facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
    boxId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, index: true },
    startedAt: { type: Date, required: true, default: Date.now },
    harvestedAt: { type: Date },
    initialWasteWeightKg: { type: Number, required: true, default: 0 },
    curedCompostWeightKg: { type: Number, default: 0 },
    volumeReductionPct: { type: Number, default: 0 },
    stage: {
      type: String,
      enum: [
        'INPUT_ACCUMULATION',
        'THERMOPHILIC_ACTIVE',
        'CURING',
        'LAB_CERTIFIED',
        'HARVESTED',
        'DISTRIBUTED',
      ],
      default: 'INPUT_ACCUMULATION',
      index: true,
    },
    labCertificate: {
      certificateNumber: { type: String },
      nitrogenPct: { type: Number },
      phosphorusPct: { type: Number },
      potassiumPct: { type: Number },
      cnRatio: { type: Number },
      ph: { type: Number },
      moisturePct: { type: Number },
      heavyMetalsPassed: { type: Boolean, default: true },
      certifiedAt: { type: Date },
      labTechnician: { type: String },
    },
    esgCarbonOffset: {
      methaneDiversionKg: { type: Number, default: 0 },
      co2EquivalentMt: { type: Number, default: 0 },
      esgRegistryStandard: { type: String, default: 'SWM_2026_CPCB_CENTRAL_INDIA' },
    },
    commercialValuation: {
      ratePerKgInr: { type: Number, default: 5.0 },
      totalValueInr: { type: Number, default: 0 },
      buyerOrganization: { type: String },
      invoiceNumber: { type: String },
    },
    notes: { type: String },
  },
  { timestamps: true }
);

CompostBatchSchema.index({ facilityId: 1, stage: 1 });

export const CompostBatch = model<ICompostBatch>('CompostBatch', CompostBatchSchema);
