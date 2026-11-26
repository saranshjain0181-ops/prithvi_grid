import mongoose, { Document, Schema } from 'mongoose';

export type WallboardWidgetType =
  | 'TODAY_PLAN'
  | 'PIT_HEATMAP'
  | 'ODOR_INDEX'
  | 'WEATHER_RADAR'
  | 'TEAM_LEADERBOARD'
  | 'SAFETY_ALERT';

export interface IKioskWorkerProfile {
  workerId: string;
  name: string;
  avatarIcon: string;
  pinHash: string; // 4-digit PIN for instant 1-second login on shared yard tablet
}

export interface IYardWallboard extends Document {
  wallboardId: string;
  entityId: string;
  facilityId: string;
  pairedDisplayPin: string;
  screenOrientation: 'LANDSCAPE' | 'PORTRAIT';
  activeWidgets: WallboardWidgetType[];
  refreshIntervalSeconds: number;
  kioskWorkers: IKioskWorkerProfile[];
  createdAt: Date;
  updatedAt: Date;
}

const YardWallboardSchema = new Schema<IYardWallboard>(
  {
    wallboardId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, unique: true, index: true },
    pairedDisplayPin: { type: String, required: true },
    screenOrientation: {
      type: String,
      enum: ['LANDSCAPE', 'PORTRAIT'],
      default: 'LANDSCAPE',
    },
    activeWidgets: [{ type: String }],
    refreshIntervalSeconds: { type: Number, default: 30 },
    kioskWorkers: [
      {
        workerId: { type: String, required: true },
        name: { type: String, required: true },
        avatarIcon: { type: String, default: 'avatar_default' },
        pinHash: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

export const YardWallboard = mongoose.model<IYardWallboard>('YardWallboard', YardWallboardSchema);
