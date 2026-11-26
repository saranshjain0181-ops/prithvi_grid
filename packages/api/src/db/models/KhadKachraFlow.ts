import { Schema, model, Document, Types } from 'mongoose';

export type FlowType = 'WASTE_IN' | 'FERTILIZER_OUT' | 'REJECT_OUT' | 'LEACHATE_OUT';

export interface IKhadKachraFlow extends Document {
  entityId: Types.ObjectId;
  facilityId: Types.ObjectId;
  boxId: Types.ObjectId;
  recordedBy: Types.ObjectId;     // ref: UserAuthRoster
  flowType: FlowType;
  weightKg: number;
  wasteCategory?: string;         // 'WET_WASTE' | 'DRY_WASTE' | 'MIXED'
  vehicleNumber?: string;
  sourceWard?: string;
  recordedAt: Date;
  /** Photo evidence URL */
  evidencePhotoUrl?: string;
  /** Receipt/challan number */
  challanNumber?: string;
  notes?: string;
  /** Running pit fill after this entry (computed) */
  pitFillKgAfter?: number;
  createdAt: Date;
  updatedAt: Date;
}

const KhadKachraFlowSchema = new Schema<IKhadKachraFlow>(
  {
    entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true },
    facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true },
    boxId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster', required: true },
    flowType: {
      type: String,
      enum: ['WASTE_IN', 'FERTILIZER_OUT', 'REJECT_OUT', 'LEACHATE_OUT'],
      required: true,
    },
    weightKg: { type: Number, required: true, min: 0 },
    wasteCategory: {
      type: String,
      enum: ['WET_WASTE', 'DRY_WASTE', 'MIXED'],
    },
    vehicleNumber: { type: String },
    sourceWard: { type: String },
    recordedAt: { type: Date, default: Date.now },
    evidencePhotoUrl: { type: String },
    challanNumber: { type: String },
    notes: { type: String },
    pitFillKgAfter: { type: Number },
  },
  { timestamps: true }
);

KhadKachraFlowSchema.index({ boxId: 1, recordedAt: -1 });
KhadKachraFlowSchema.index({ facilityId: 1, recordedAt: -1 });
KhadKachraFlowSchema.index({ entityId: 1, flowType: 1, recordedAt: -1 });

export const KhadKachraFlow = model<IKhadKachraFlow>('KhadKachraFlow', KhadKachraFlowSchema);
