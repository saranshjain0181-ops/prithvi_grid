import mongoose, { Document, Schema } from 'mongoose';

export interface ICareRoundChecklist {
  heatsinkFinsCleaned: boolean; // clears crust/debris from LTC3108 TEG heat-sink
  opticalWindowWiped: boolean;  // cleans optical / solar surface
  referenceJunctionDesalted: boolean; // rinses saline buildup around probe junction
  cableGlandsTightened: boolean;
  physicalSpearVertical: boolean; // confirms spear not tilted/struck by turning fork
  tamperSealIntact: boolean;
}

export interface ITelemetryVerification {
  tegDeltaTBefore?: number;
  tegDeltaTAfter?: number;
  harvestReboundPercent?: number; // e.g. +18% thermal harvest recovery
  voltageRecoveryMv?: number;
  truckRollAvoided: boolean; // true saves ₹750 field technician dispatch
}

export interface ICareRound extends Document {
  roundId: string;
  entityId: string;
  facilityId: string;
  nodeId: string;
  performedBy: string;
  roundDate: string; // YYYY-MM-DD
  checklist: ICareRoundChecklist;
  telemetryVerification: ITelemetryVerification;
  photoBeforeUrl?: string;
  photoAfterUrl?: string;
  workerNotes?: string;
  aiFeedbackGuidance?: string; // Hindi/Hinglish care tip
  requiresEscalation: boolean; // true if physical damage/battery fault needs field tech
  createdAt: Date;
  updatedAt: Date;
}

const CareRoundSchema = new Schema<ICareRound>(
  {
    roundId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    nodeId: { type: String, required: true, index: true },
    performedBy: { type: String, required: true },
    roundDate: { type: String, required: true, index: true },
    checklist: {
      heatsinkFinsCleaned: { type: Boolean, default: false },
      opticalWindowWiped: { type: Boolean, default: false },
      referenceJunctionDesalted: { type: Boolean, default: false },
      cableGlandsTightened: { type: Boolean, default: false },
      physicalSpearVertical: { type: Boolean, default: false },
      tamperSealIntact: { type: Boolean, default: true },
    },
    telemetryVerification: {
      tegDeltaTBefore: { type: Number },
      tegDeltaTAfter: { type: Number },
      harvestReboundPercent: { type: Number, default: 0 },
      voltageRecoveryMv: { type: Number, default: 0 },
      truckRollAvoided: { type: Boolean, default: false },
    },
    photoBeforeUrl: { type: String },
    photoAfterUrl: { type: String },
    workerNotes: { type: String },
    aiFeedbackGuidance: { type: String },
    requiresEscalation: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CareRoundSchema.index({ facilityId: 1, nodeId: 1, roundDate: 1 });

export const CareRound = mongoose.model<ICareRound>('CareRound', CareRoundSchema);
