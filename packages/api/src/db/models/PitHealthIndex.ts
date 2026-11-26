import { Schema, model, Document, Types } from 'mongoose';

export type HealthGrade = 'OPTIMAL' | 'ACCEPTABLE' | 'ATTENTION_NEEDED' | 'CRITICAL_RISK';

export interface IExplainAndFixAction {
  actionType: 'TURN_HEAP' | 'SPRINKLE_WATER' | 'ADD_BULKING_MATERIAL' | 'ADD_WOOD_ASH' | 'CALIBRATE_SENSOR';
  actionLabelEn: string;
  actionLabelHi: string;
  expectedIndexDelta: number;
  basisCoeff: string;
  suggestedTaskId?: string;
}

export interface IScoreDragItem {
  component: 'THERMAL' | 'MOISTURE' | 'ACIDITY' | 'AERATION' | 'PROGRESS' | 'DATA_TRUST';
  dragPoints: number;
  explanation: string;
}

export interface IPitHealthIndexRecord extends Document {
  pitId: Types.ObjectId;
  facilityId: Types.ObjectId;
  assessedAt: Date;
  overallIndex: number; // 0 to 100
  grade: HealthGrade;
  subScores: {
    thermalScore: number;
    moistureScore: number;
    acidityScore: number;
    aerationScore: number;
    progressScore: number;
    dataTrustScore: number;
  };
  isCappedByCriticalAlert: boolean;
  criticalAlertId?: Types.ObjectId;
  isInsufficientData: boolean;
  topDrags: IScoreDragItem[];
  explainAndFix: IExplainAndFixAction;
  thirtyDayHealthyPct: number;
}

const ScoreDragSchema = new Schema<IScoreDragItem>({
  component: {
    type: String,
    enum: ['THERMAL', 'MOISTURE', 'ACIDITY', 'AERATION', 'PROGRESS', 'DATA_TRUST'],
    required: true,
  },
  dragPoints: { type: Number, required: true },
  explanation: { type: String, required: true },
}, { _id: false });

const ExplainAndFixSchema = new Schema<IExplainAndFixAction>({
  actionType: {
    type: String,
    enum: ['TURN_HEAP', 'SPRINKLE_WATER', 'ADD_BULKING_MATERIAL', 'ADD_WOOD_ASH', 'CALIBRATE_SENSOR'],
    required: true,
  },
  actionLabelEn: { type: String, required: true },
  actionLabelHi: { type: String, required: true },
  expectedIndexDelta: { type: Number, required: true },
  basisCoeff: { type: String, required: true },
  suggestedTaskId: { type: String },
}, { _id: false });

export const PitHealthIndexSchema = new Schema<IPitHealthIndexRecord>({
  pitId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, index: true },
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
  assessedAt: { type: Date, default: Date.now, index: true },
  overallIndex: { type: Number, required: true, min: 0, max: 100 },
  grade: {
    type: String,
    enum: ['OPTIMAL', 'ACCEPTABLE', 'ATTENTION_NEEDED', 'CRITICAL_RISK'],
    required: true,
  },
  subScores: {
    thermalScore: { type: Number, required: true, min: 0, max: 100 },
    moistureScore: { type: Number, required: true, min: 0, max: 100 },
    acidityScore: { type: Number, required: true, min: 0, max: 100 },
    aerationScore: { type: Number, required: true, min: 0, max: 100 },
    progressScore: { type: Number, required: true, min: 0, max: 100 },
    dataTrustScore: { type: Number, required: true, min: 0, max: 100 },
  },
  isCappedByCriticalAlert: { type: Boolean, default: false },
  criticalAlertId: { type: Schema.Types.ObjectId, ref: 'AiAlertSanjivani' },
  isInsufficientData: { type: Boolean, default: false },
  topDrags: [ScoreDragSchema],
  explainAndFix: ExplainAndFixSchema,
  thirtyDayHealthyPct: { type: Number, default: 90 },
}, { timestamps: true });

PitHealthIndexSchema.index({ pitId: 1, assessedAt: -1 });

export const PitHealthIndexRecord = model<IPitHealthIndexRecord>('PitHealthIndexRecord', PitHealthIndexSchema);
