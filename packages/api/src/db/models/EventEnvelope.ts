import mongoose, { Document, Schema } from 'mongoose';

export interface IEntityReference {
  entityType: string; // e.g. 'pit', 'batch', 'container', 'worker', 'equipment', 'lot'
  entityId: string;
}

export interface IEventEnvelope<T = any> extends Document {
  eventId: string;
  eventType: string; // domain.entity.verb e.g. 'pit.load.completed'
  schemaVersion: number;
  tenantId: string;
  facilityId: string;
  entityRefs: IEntityReference[];
  actor: {
    actorId: string;
    role: string;
    actorType: 'USER' | 'DEVICE' | 'SYSTEM';
  };
  occurrenceTime: Date;
  serverTime: Date;
  correlationId: string;
  causationId?: string;
  payload: T;
  evidenceRefs: string[];
  confidence?: number;
  source: 'DEVICE' | 'APP' | 'IMPORT' | 'SYSTEM';
  audienceRoles: string[];
  containsPersonalData: boolean;
  isPublished: boolean;
  createdAt: Date;
}

const EventEnvelopeSchema = new Schema<IEventEnvelope>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    schemaVersion: { type: Number, required: true, default: 1 },
    tenantId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    entityRefs: [
      {
        entityType: { type: String, required: true },
        entityId: { type: String, required: true },
      },
    ],
    actor: {
      actorId: { type: String, required: true },
      role: { type: String, required: true },
      actorType: { type: String, required: true, enum: ['USER', 'DEVICE', 'SYSTEM'] },
    },
    occurrenceTime: { type: Date, required: true, default: Date.now },
    serverTime: { type: Date, required: true, default: Date.now },
    correlationId: { type: String, required: true, index: true },
    causationId: { type: String },
    payload: { type: Schema.Types.Mixed, required: true },
    evidenceRefs: [{ type: String }],
    confidence: { type: Number },
    source: { type: String, required: true, enum: ['DEVICE', 'APP', 'IMPORT', 'SYSTEM'] },
    audienceRoles: [{ type: String }],
    containsPersonalData: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

EventEnvelopeSchema.index({ facilityId: 1, eventType: 1, occurrenceTime: -1 });

export const EventEnvelope = mongoose.model<IEventEnvelope>('EventEnvelope', EventEnvelopeSchema);
