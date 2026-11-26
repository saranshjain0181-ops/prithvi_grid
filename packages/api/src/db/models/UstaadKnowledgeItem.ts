import { Schema, model, Document, Types } from 'mongoose';

export interface IUstaadKnowledgeItem extends Document {
  facilityId: Types.ObjectId;
  contributedByWorkerId: Types.ObjectId;
  situationContext: string; // e.g. "Monsoon high humidity with oily kitchen waste"
  observationText: string;
  recommendedAction: string;
  cautionNotice: string;
  sensorSnapshotAtObservation: {
    tempC: number;
    moisturePct: number;
    ph: number;
    methanePpm: number;
  };
  reviewStatus: 'PENDING_EXPERT_REVIEW' | 'APPROVED_AGRONOMY' | 'REJECTED_UNSAFE';
  reviewedBy?: Types.ObjectId;
  reviewComment?: string;
  clusterTag?: string;
  upvotesCount: number;
}

export const UstaadKnowledgeItemSchema = new Schema<IUstaadKnowledgeItem>({
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
  contributedByWorkerId: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster', required: true },
  situationContext: { type: String, required: true },
  observationText: { type: String, required: true },
  recommendedAction: { type: String, required: true },
  cautionNotice: { type: String, required: true },
  sensorSnapshotAtObservation: {
    tempC: { type: Number, required: true },
    moisturePct: { type: Number, required: true },
    ph: { type: Number, required: true },
    methanePpm: { type: Number, required: true },
  },
  reviewStatus: {
    type: String,
    enum: ['PENDING_EXPERT_REVIEW', 'APPROVED_AGRONOMY', 'REJECTED_UNSAFE'],
    default: 'PENDING_EXPERT_REVIEW',
  },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster' },
  reviewComment: { type: String },
  clusterTag: { type: String },
  upvotesCount: { type: Number, default: 0 },
}, { timestamps: true });

export const UstaadKnowledgeItem = model<IUstaadKnowledgeItem>('UstaadKnowledgeItem', UstaadKnowledgeItemSchema);
