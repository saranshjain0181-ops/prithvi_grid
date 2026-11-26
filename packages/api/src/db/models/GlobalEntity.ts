import { Schema, model, Document, Types } from 'mongoose';

export interface IGlobalEntity extends Document {
  name: string;
  slug: string;
  type: 'ULB' | 'CORPORATION' | 'PANCHAYAT' | 'NGO';
  state: string;
  district: string;
  city: string;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  licenseKey: string;
  licenseExpiresAt: Date;
  isActive: boolean;
  settings: {
    maxFacilities: number;
    maxNodes: number;
    whatsappAlerts: boolean;
    complianceReportingEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const GlobalEntitySchema = new Schema<IGlobalEntity>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: {
      type: String,
      enum: ['ULB', 'CORPORATION', 'PANCHAYAT', 'NGO'],
      required: true,
    },
    state: { type: String, required: true },
    district: { type: String, required: true },
    city: { type: String, required: true },
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    contactEmail: { type: String },
    licenseKey: { type: String, required: true, unique: true },
    licenseExpiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    settings: {
      maxFacilities: { type: Number, default: 10 },
      maxNodes: { type: Number, default: 100 },
      whatsappAlerts: { type: Boolean, default: false },
      complianceReportingEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const GlobalEntity = model<IGlobalEntity>('GlobalEntity', GlobalEntitySchema);
