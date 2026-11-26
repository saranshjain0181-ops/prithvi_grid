import { Schema, model, Document, Types } from 'mongoose';

export interface IMunicipalPartnerPortalShare extends Document {
  facilityId: Types.ObjectId;
  entityId: Types.ObjectId;
  ulbZoneCode: string; // e.g. "IMC_ZONE_04"
  wardNumber: string;
  isOptedIn: boolean;
  sharedCategories: {
    complianceCertificates: boolean;
    pitPassportSummaries: boolean;
    wasteDiversionTotals: boolean;
    realTimeSensorStream: boolean; // default false (privacy safeguard)
  };
  consentGrantedBy: Types.ObjectId;
  consentGrantedAt: Date;
  lastAccessByUlbInspectorAt?: Date;
}

export const MunicipalPartnerPortalSchema = new Schema<IMunicipalPartnerPortalShare>({
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, unique: true, index: true },
  entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
  ulbZoneCode: { type: String, required: true },
  wardNumber: { type: String, required: true },
  isOptedIn: { type: Boolean, default: false },
  sharedCategories: {
    complianceCertificates: { type: Boolean, default: true },
    pitPassportSummaries: { type: Boolean, default: true },
    wasteDiversionTotals: { type: Boolean, default: true },
    realTimeSensorStream: { type: Boolean, default: false },
  },
  consentGrantedBy: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster', required: true },
  consentGrantedAt: { type: Date, default: Date.now },
  lastAccessByUlbInspectorAt: { type: Date },
}, { timestamps: true });

export const MunicipalPartnerPortalShare = model<IMunicipalPartnerPortalShare>('MunicipalPartnerPortalShare', MunicipalPartnerPortalSchema);
