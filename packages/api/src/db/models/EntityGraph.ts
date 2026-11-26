import mongoose, { Document, Schema } from 'mongoose';

export type RelationshipType =
  | 'contains'
  | 'derived-from'
  | 'consumed-in'
  | 'produced-by'
  | 'sampled-from'
  | 'sold-to'
  | 'located-in'
  | 'verified-by';

export interface IEntityEdge extends Document {
  edgeId: string;
  tenantId: string;
  fromEntityType: string; // e.g. 'container'
  fromEntityId: string;
  toEntityType: string;   // e.g. 'pit'
  toEntityId: string;
  relationshipType: RelationshipType;
  sourceEventId?: string;
  validFrom: Date;
  validTo?: Date;
  createdAt: Date;
}

const EntityEdgeSchema = new Schema<IEntityEdge>(
  {
    edgeId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },
    fromEntityType: { type: String, required: true, index: true },
    fromEntityId: { type: String, required: true, index: true },
    toEntityType: { type: String, required: true, index: true },
    toEntityId: { type: String, required: true, index: true },
    relationshipType: {
      type: String,
      required: true,
      enum: [
        'contains',
        'derived-from',
        'consumed-in',
        'produced-by',
        'sampled-from',
        'sold-to',
        'located-in',
        'verified-by',
      ],
      index: true,
    },
    sourceEventId: { type: String },
    validFrom: { type: Date, default: Date.now },
    validTo: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

EntityEdgeSchema.index({ fromEntityType: 1, fromEntityId: 1 });
EntityEdgeSchema.index({ toEntityType: 1, toEntityId: 1 });

export const EntityEdge = mongoose.model<IEntityEdge>('EntityEdge', EntityEdgeSchema);
