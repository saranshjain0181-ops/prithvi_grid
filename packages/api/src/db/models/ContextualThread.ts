import mongoose, { Document, Schema } from 'mongoose';

export type ContextEntityType = 'PIT' | 'ALERT' | 'TASK' | 'EQUIPMENT' | 'BATCH';

export interface IThreadMessage {
  messageId: string;
  authorId: string;
  authorRole: string;
  originalText: string;
  originalLanguage: 'en' | 'hi' | 'hinglish';
  translatedText?: string;
  translatedLanguage?: string;
  audioUrl?: string;
  timestamp: Date;
}

export interface IContextualThread extends Document {
  threadId: string;
  entityId: string;
  facilityId: string;
  targetEntityType: ContextEntityType;
  targetEntityId: string;
  title: string;
  messages: IThreadMessage[];
  status: 'OPEN' | 'RESOLVED';
  createdAt: Date;
  updatedAt: Date;
}

const ContextualThreadSchema = new Schema<IContextualThread>(
  {
    threadId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    targetEntityType: {
      type: String,
      required: true,
      enum: ['PIT', 'ALERT', 'TASK', 'EQUIPMENT', 'BATCH'],
      index: true,
    },
    targetEntityId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    messages: [
      {
        messageId: { type: String, required: true },
        authorId: { type: String, required: true },
        authorRole: { type: String, required: true },
        originalText: { type: String, required: true },
        originalLanguage: { type: String, default: 'hi' },
        translatedText: { type: String },
        translatedLanguage: { type: String },
        audioUrl: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      required: true,
      enum: ['OPEN', 'RESOLVED'],
      default: 'OPEN',
      index: true,
    },
  },
  { timestamps: true }
);

ContextualThreadSchema.index({ facilityId: 1, targetEntityType: 1, targetEntityId: 1 });

export const ContextualThread = mongoose.model<IContextualThread>(
  'ContextualThread',
  ContextualThreadSchema
);
