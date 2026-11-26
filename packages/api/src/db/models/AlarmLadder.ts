import mongoose, { Document, Schema } from 'mongoose';

export type LadderStep = 'IN_APP_WORKER' | 'PUSH_WHATSAPP_SUPERVISOR' | 'WALLBOARD_KIOSK' | 'VOICE_CALL_ONCALL' | 'NODE_PIEZO_BUZZER';

export interface IAlarmLadderRecord extends Document {
  alarmId: string;
  facilityId: string;
  pitId: string;
  alarmType: 'ANAEROBIC_ODOR' | 'OVERHEATING' | 'FIRE_RISK' | 'TAMPER' | 'COLD_STALL';
  severity: 'WARNING' | 'CRITICAL' | 'EMERGENCY_SAFETY';
  currentStep: LadderStep;
  isQuietZoneSuppressed: boolean;
  quietZoneName?: string;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  isRemoteSilenced: boolean;
  silencedReason?: string;
  silencedUntil?: Date;
  ladderHistory: Array<{
    step: LadderStep;
    dispatchedAt: Date;
    channelStatus: string;
  }>;
  createdAt: Date;
}

const AlarmLadderSchema = new Schema<IAlarmLadderRecord>(
  {
    alarmId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    pitId: { type: String, required: true, index: true },
    alarmType: {
      type: String,
      required: true,
      enum: ['ANAEROBIC_ODOR', 'OVERHEATING', 'FIRE_RISK', 'TAMPER', 'COLD_STALL'],
    },
    severity: {
      type: String,
      required: true,
      enum: ['WARNING', 'CRITICAL', 'EMERGENCY_SAFETY'],
    },
    currentStep: {
      type: String,
      required: true,
      enum: ['IN_APP_WORKER', 'PUSH_WHATSAPP_SUPERVISOR', 'WALLBOARD_KIOSK', 'VOICE_CALL_ONCALL', 'NODE_PIEZO_BUZZER'],
      default: 'IN_APP_WORKER',
    },
    isQuietZoneSuppressed: { type: Boolean, default: false },
    quietZoneName: { type: String },
    isAcknowledged: { type: Boolean, default: false },
    acknowledgedBy: { type: String },
    acknowledgedAt: { type: Date },
    isRemoteSilenced: { type: Boolean, default: false },
    silencedReason: { type: String },
    silencedUntil: { type: Date },
    ladderHistory: [
      {
        step: { type: String, required: true },
        dispatchedAt: { type: Date, required: true },
        channelStatus: { type: String, required: true },
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AlarmLadder = mongoose.model<IAlarmLadderRecord>('AlarmLadder', AlarmLadderSchema);
