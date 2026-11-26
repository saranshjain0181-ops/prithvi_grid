import { Schema, model, Document, Types } from 'mongoose';

export type PlanTaskType = 'TURNING' | 'WATERING' | 'ADD_BULKING' | 'ADD_ASH' | 'LOAD_WASTE' | 'MAINTENANCE' | 'WEATHER_PREVENTION';

export interface IDailyPlanTask extends Document {
  facilityId: Types.ObjectId;
  workerId: Types.ObjectId;
  pitId: Types.ObjectId;
  planDate: string; // YYYY-MM-DD
  taskOrder: number; // 1, 2, 3...
  taskType: PlanTaskType;
  titleEn: string;
  titleHi: string;
  audioPromptHi: string; // Plain Hindi audio instruction
  reasonEn: string;
  reasonHi: string;
  urgencyScore: number; // 0 to 100
  expectedEffortMinutes: number;
  expectedBenefitDelta: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DEFERRED' | 'REJECTED';
  completedAt?: Date;
  feedback?: {
    isWrongSuggestion: boolean;
    workerRemark?: string;
    reportedAt: Date;
  };
}

export const DailyPlanTaskSchema = new Schema<IDailyPlanTask>({
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
  workerId: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster', required: true, index: true },
  pitId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, index: true },
  planDate: { type: String, required: true, index: true },
  taskOrder: { type: Number, required: true },
  taskType: {
    type: String,
    enum: ['TURNING', 'WATERING', 'ADD_BULKING', 'ADD_ASH', 'LOAD_WASTE', 'MAINTENANCE', 'WEATHER_PREVENTION'],
    required: true,
  },
  titleEn: { type: String, required: true },
  titleHi: { type: String, required: true },
  audioPromptHi: { type: String, required: true },
  reasonEn: { type: String, required: true },
  reasonHi: { type: String, required: true },
  urgencyScore: { type: Number, required: true },
  expectedEffortMinutes: { type: Number, required: true, default: 20 },
  expectedBenefitDelta: { type: Number, required: true, default: 10 },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DEFERRED', 'REJECTED'],
    default: 'PENDING',
  },
  completedAt: { type: Date },
  feedback: {
    isWrongSuggestion: { type: Boolean, default: false },
    workerRemark: { type: String },
    reportedAt: { type: Date },
  },
}, { timestamps: true });

DailyPlanTaskSchema.index({ workerId: 1, planDate: 1, taskOrder: 1 });

export const DailyPlanTask = model<IDailyPlanTask>('DailyPlanTask', DailyPlanTaskSchema);
