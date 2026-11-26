import { Schema, model, Document, Types } from 'mongoose';

export type ComplaintLocationZone = 'HOTEL_LOBBY' | 'GUEST_ROOMS' | 'RESTAURANT_OUTDOOR' | 'SWIMMING_POOL' | 'STAFF_QUARTERS';
export type OdorSymptomType = 'FOUL_SULFUR_SMELL' | 'FLIES_INSECTS' | 'LEACHATE_LEAKAGE' | 'SMOKE_HOT_STEAM';

export interface IOdorComplaintRecord extends Document {
  facilityId: Types.ObjectId;
  reportedByRole: 'HOTEL_GUEST' | 'FRONT_DESK' | 'HOUSEKEEPING' | 'SECURITY';
  zone: ComplaintLocationZone;
  symptom: OdorSymptomType;
  severity: 'MILD' | 'NOTICEABLE' | 'SEVERE_DISRUPTIVE';
  reportedAt: Date;
  windSpeedKmphAtReport?: number;
  windDirectionDegAtReport?: number;
  attributedSourcePitId?: Types.ObjectId;
  attributionConfidencePct: number;
  mitigationActionTaken?: string;
  resolvedAt?: Date;
}

export const OdorComplaintRecordSchema = new Schema<IOdorComplaintRecord>({
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
  reportedByRole: {
    type: String,
    enum: ['HOTEL_GUEST', 'FRONT_DESK', 'HOUSEKEEPING', 'SECURITY'],
    required: true,
  },
  zone: {
    type: String,
    enum: ['HOTEL_LOBBY', 'GUEST_ROOMS', 'RESTAURANT_OUTDOOR', 'SWIMMING_POOL', 'STAFF_QUARTERS'],
    required: true,
  },
  symptom: {
    type: String,
    enum: ['FOUL_SULFUR_SMELL', 'FLIES_INSECTS', 'LEACHATE_LEAKAGE', 'SMOKE_HOT_STEAM'],
    required: true,
  },
  severity: {
    type: String,
    enum: ['MILD', 'NOTICEABLE', 'SEVERE_DISRUPTIVE'],
    required: true,
  },
  reportedAt: { type: Date, default: Date.now, index: true },
  windSpeedKmphAtReport: { type: Number },
  windDirectionDegAtReport: { type: Number },
  attributedSourcePitId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset' },
  attributionConfidencePct: { type: Number, default: 75 },
  mitigationActionTaken: { type: String },
  resolvedAt: { type: Date },
}, { timestamps: true });

export const OdorComplaintRecord = model<IOdorComplaintRecord>('OdorComplaintRecord', OdorComplaintRecordSchema);
