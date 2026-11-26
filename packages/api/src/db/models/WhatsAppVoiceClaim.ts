import { Schema, model, Document, Types } from 'mongoose';

export interface IWhatsAppVoiceClaim extends Document {
  workerId: Types.ObjectId;
  facilityId: Types.ObjectId;
  phoneNumber: string; // E.164 format, e.g. +919876543210
  whatsappMessageId: string;
  audioDurationSeconds?: number;
  rawTranscript?: string;
  extractedDraft: {
    actionType: 'TURNING' | 'WATERING' | 'ADD_BULKING' | 'ADD_ASH' | 'LOAD_WASTE';
    pitId: Types.ObjectId;
    pitCode: string;
    quantityAmount?: number;
    quantityUnit?: string;
    timeReference?: string;
    confidencePct: number;
  };
  confirmationState: 'AWAITING_CONFIRMATION' | 'CONFIRMED_HAAN' | 'REJECTED_NAHI' | 'CORRECTED' | 'EXPIRED';
  confirmedAt?: Date;
  committedLedgerId?: Types.ObjectId;
}

export const WhatsAppVoiceClaimSchema = new Schema<IWhatsAppVoiceClaim>({
  workerId: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster', required: true, index: true },
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
  phoneNumber: { type: String, required: true, index: true },
  whatsappMessageId: { type: String, required: true, unique: true },
  audioDurationSeconds: { type: Number },
  rawTranscript: { type: String },
  extractedDraft: {
    actionType: {
      type: String,
      enum: ['TURNING', 'WATERING', 'ADD_BULKING', 'ADD_ASH', 'LOAD_WASTE'],
      required: true,
    },
    pitId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true },
    pitCode: { type: String, required: true },
    quantityAmount: { type: Number },
    quantityUnit: { type: String },
    timeReference: { type: String },
    confidencePct: { type: Number, required: true },
  },
  confirmationState: {
    type: String,
    enum: ['AWAITING_CONFIRMATION', 'CONFIRMED_HAAN', 'REJECTED_NAHI', 'CORRECTED', 'EXPIRED'],
    default: 'AWAITING_CONFIRMATION',
  },
  confirmedAt: { type: Date },
  committedLedgerId: { type: Schema.Types.ObjectId, ref: 'LabourExecutionLedger' },
}, { timestamps: true });

export const WhatsAppVoiceClaim = model<IWhatsAppVoiceClaim>('WhatsAppVoiceClaim', WhatsAppVoiceClaimSchema);
