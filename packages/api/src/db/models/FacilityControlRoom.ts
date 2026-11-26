import mongoose, { Document, Schema } from 'mongoose';

export type ControlRoomMode = 'MORNING_MODE' | 'LIVE_MODE' | 'EVENING_MODE';

export interface IStageQueueMetric {
  stageName: 'RECEIVING' | 'PREPARATION' | 'COMPOSTING' | 'CURING' | 'FINISHING';
  workInProgressKg: number;
  averageQueueHours: number;
  isBottleneck: boolean;
}

export interface IFacilityControlRoomRecord extends Document {
  facilityId: string;
  activeMode: ControlRoomMode;
  stageFlow: IStageQueueMetric[];
  activePitCount: number;
  criticalAlertsCount: number;
  pendingDecisionsCount: number;
  todayCostInr: number;
  updatedAt: Date;
}

const FacilityControlRoomSchema = new Schema<IFacilityControlRoomRecord>(
  {
    facilityId: { type: String, required: true, unique: true, index: true },
    activeMode: {
      type: String,
      required: true,
      enum: ['MORNING_MODE', 'LIVE_MODE', 'EVENING_MODE'],
      default: 'LIVE_MODE',
    },
    stageFlow: [
      {
        stageName: {
          type: String,
          required: true,
          enum: ['RECEIVING', 'PREPARATION', 'COMPOSTING', 'CURING', 'FINISHING'],
        },
        workInProgressKg: { type: Number, required: true },
        averageQueueHours: { type: Number, required: true },
        isBottleneck: { type: Boolean, default: false },
      },
    ],
    activePitCount: { type: Number, default: 0 },
    criticalAlertsCount: { type: Number, default: 0 },
    pendingDecisionsCount: { type: Number, default: 0 },
    todayCostInr: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const FacilityControlRoom = mongoose.model<IFacilityControlRoomRecord>(
  'FacilityControlRoom',
  FacilityControlRoomSchema
);
