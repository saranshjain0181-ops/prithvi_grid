import { Schema, model, Document, Types } from 'mongoose';

export interface IFacilityLocation extends Document {
  entityId: Types.ObjectId;
  name: string;
  code: string;
  address: string;
  ward?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  totalBoxes: number;
  totalNodes: number;
  facilityType: 'CENTRALIZED' | 'DECENTRALIZED' | 'WINDROW' | 'VERMI';
  operationalStatus: 'ACTIVE' | 'MAINTENANCE' | 'OFFLINE' | 'DECOMMISSIONED';
  managerIds: Types.ObjectId[];
  totalCapacityKg: number;
  currentFillKg: number;
  createdAt: Date;
  updatedAt: Date;
}

const FacilityLocationSchema = new Schema<IFacilityLocation>(
  {
    entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    ward: { type: String },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    totalBoxes: { type: Number, default: 0 },
    totalNodes: { type: Number, default: 0 },
    facilityType: {
      type: String,
      enum: ['CENTRALIZED', 'DECENTRALIZED', 'WINDROW', 'VERMI'],
      default: 'DECENTRALIZED',
    },
    operationalStatus: {
      type: String,
      enum: ['ACTIVE', 'MAINTENANCE', 'OFFLINE', 'DECOMMISSIONED'],
      default: 'ACTIVE',
    },
    managerIds: [{ type: Schema.Types.ObjectId, ref: 'UserAuthRoster' }],
    totalCapacityKg: { type: Number, default: 0 },
    currentFillKg: { type: Number, default: 0 },
  },
  { timestamps: true }
);

FacilityLocationSchema.index({ entityId: 1, code: 1 }, { unique: true });
FacilityLocationSchema.index({ operationalStatus: 1 });

export const FacilityLocation = model<IFacilityLocation>('FacilityLocation', FacilityLocationSchema);
