import { Schema, model, Document, Types } from 'mongoose';
import { ALERT_TYPES } from '../../config/constants';

export type AlertType = keyof typeof ALERT_TYPES;
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SUPPRESSED';

export interface ISanjivaniRecipeCard {
  problem: string;
  diagnosis: string;
  actions: string[];
  estimatedRecoveryHrs: number;
}

export interface IAiAlertSanjivani extends Document {
  entityId: Types.ObjectId;
  facilityId: Types.ObjectId;
  nodeId?: Types.ObjectId;
  boxId?: Types.ObjectId;
  alertType: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  triggeredAt: Date;
  /** Snapshot of telemetry values that triggered the alert */
  triggerValues: {
    tempC?: number;
    moisturePct?: number;
    ph?: number;
    methanePpm?: number;
    airPressureHpa?: number;
    pitFillPct?: number;
  };
  /** AI-generated recipe card for remediation */
  recipeCard?: ISanjivaniRecipeCard;
  acknowledgedBy?: Types.ObjectId;
  acknowledgedAt?: Date;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  resolutionNotes?: string;
  /** WhatsApp notification sent flag */
  whatsappSent?: boolean;
  whatsappSentAt?: Date;
  /** Socket.IO emit timestamp */
  socketEmittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RecipeCardSchema = new Schema<ISanjivaniRecipeCard>(
  {
    problem: { type: String, required: true },
    diagnosis: { type: String, required: true },
    actions: [{ type: String }],
    estimatedRecoveryHrs: { type: Number },
  },
  { _id: false }
);

const AiAlertSanjivaniSchema = new Schema<IAiAlertSanjivani>(
  {
    entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true },
    facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true },
    nodeId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset' },
    boxId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset' },
    alertType: {
      type: String,
      enum: Object.keys(ALERT_TYPES),
      required: true,
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL'],
      default: 'WARNING',
    },
    status: {
      type: String,
      enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED'],
      default: 'OPEN',
    },
    triggeredAt: { type: Date, default: Date.now },
    triggerValues: {
      tempC: { type: Number },
      moisturePct: { type: Number },
      ph: { type: Number },
      methanePpm: { type: Number },
      airPressureHpa: { type: Number },
      pitFillPct: { type: Number },
    },
    recipeCard: { type: RecipeCardSchema },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster' },
    acknowledgedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster' },
    resolvedAt: { type: Date },
    resolutionNotes: { type: String },
    whatsappSent: { type: Boolean, default: false },
    whatsappSentAt: { type: Date },
    socketEmittedAt: { type: Date },
  },
  { timestamps: true }
);

AiAlertSanjivaniSchema.index({ facilityId: 1, status: 1, triggeredAt: -1 });
AiAlertSanjivaniSchema.index({ entityId: 1, alertType: 1, triggeredAt: -1 });
AiAlertSanjivaniSchema.index({ nodeId: 1, triggeredAt: -1 });

export const AiAlertSanjivani = model<IAiAlertSanjivani>('AiAlertSanjivani', AiAlertSanjivaniSchema);
