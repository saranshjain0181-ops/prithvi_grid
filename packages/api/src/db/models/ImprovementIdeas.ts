import mongoose, { Document, Schema } from 'mongoose';

export type IdeaTheme = 'TIME_SAVING' | 'SAFETY_ERGONOMICS' | 'QUALITY_ODOR' | 'COST_SAVING' | 'COMFORT';
export type IdeaStatus = 'SUBMITTED' | 'TRIAGED_APPROVED' | 'PILOTING' | 'ADOPTED' | 'REJECTED';

export interface IImprovementIdeaRecord extends Document {
  ideaId: string;
  facilityId: string;
  submitterWorkerId: string;
  theme: IdeaTheme;
  title: string;
  description: string;
  audioVoiceNoteUrl?: string;
  photoUrl?: string;
  status: IdeaStatus;
  triageNotes?: string;
  pilotMetricBaseline?: string;
  pilotMetricResult?: string;
  estimatedAnnualSavingsInr?: number;
  adoptedSopRef?: string;
  createdAt: Date;
}

const ImprovementIdeaSchema = new Schema<IImprovementIdeaRecord>(
  {
    ideaId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    submitterWorkerId: { type: String, required: true },
    theme: {
      type: String,
      required: true,
      enum: ['TIME_SAVING', 'SAFETY_ERGONOMICS', 'QUALITY_ODOR', 'COST_SAVING', 'COMFORT'],
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    audioVoiceNoteUrl: { type: String },
    photoUrl: { type: String },
    status: {
      type: String,
      required: true,
      enum: ['SUBMITTED', 'TRIAGED_APPROVED', 'PILOTING', 'ADOPTED', 'REJECTED'],
      default: 'SUBMITTED',
    },
    triageNotes: { type: String },
    pilotMetricBaseline: { type: String },
    pilotMetricResult: { type: String },
    estimatedAnnualSavingsInr: { type: Number },
    adoptedSopRef: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ImprovementIdea = mongoose.model<IImprovementIdeaRecord>(
  'ImprovementIdea',
  ImprovementIdeaSchema
);
