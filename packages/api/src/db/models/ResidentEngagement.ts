import mongoose, { Document, Schema } from 'mongoose';

export interface ITowerParticipation {
  towerId: string;
  towerName: string;
  totalFlatsCount: number;
  participatingFlatsCount: number;
  participationPct: number;
  monthlyWasteKg: number;
  segregationScorePct: number;
  rank: number;
}

export interface IResidentVoucherRecord extends Document {
  voucherCode: string;
  facilityId: string;
  residentId: string;
  towerId: string;
  flatNumber: string;
  allocatedBagsCount: number;
  bagWeightKg: number;
  isRedeemed: boolean;
  redeemedAt?: Date;
  issuedAt: Date;
  expiresAt: Date;
}

const ResidentVoucherSchema = new Schema<IResidentVoucherRecord>(
  {
    voucherCode: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    residentId: { type: String, required: true, index: true },
    towerId: { type: String, required: true },
    flatNumber: { type: String, required: true },
    allocatedBagsCount: { type: Number, required: true, default: 1 },
    bagWeightKg: { type: Number, default: 5 },
    isRedeemed: { type: Boolean, default: false },
    redeemedAt: { type: Date },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ResidentVoucher = mongoose.model<IResidentVoucherRecord>(
  'ResidentVoucher',
  ResidentVoucherSchema
);
