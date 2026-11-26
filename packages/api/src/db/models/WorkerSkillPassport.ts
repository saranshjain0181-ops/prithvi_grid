import { Schema, model, Document, Types } from 'mongoose';

export interface IWorkerSkillPassport extends Document {
  workerId: Types.ObjectId;
  entityId: Types.ObjectId;
  passportId: string; // e.g. "SKILL-PG-2026-IND-042"
  workerName: string;
  totalVerifiedTasksCount: number; // Counts only, never punitive reliability scores
  completedMicroLessons: string[];
  safetyCertifications: string[];
  tenureMonths: number;
  qrSignatureHash: string;
  monthlyPoolSharePct?: number;
  lastPayoutRecommendedInr?: number;
}

export const WorkerSkillPassportSchema = new Schema<IWorkerSkillPassport>({
  workerId: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster', required: true, unique: true, index: true },
  entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
  passportId: { type: String, required: true, unique: true },
  workerName: { type: String, required: true },
  totalVerifiedTasksCount: { type: Number, default: 0 },
  completedMicroLessons: [{ type: String }],
  safetyCertifications: [{ type: String }],
  tenureMonths: { type: Number, default: 1 },
  qrSignatureHash: { type: String, required: true },
  monthlyPoolSharePct: { type: Number },
  lastPayoutRecommendedInr: { type: Number },
}, { timestamps: true });

export const WorkerSkillPassport = model<IWorkerSkillPassport>('WorkerSkillPassport', WorkerSkillPassportSchema);
