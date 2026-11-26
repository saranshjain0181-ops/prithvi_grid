import mongoose, { Document, Schema } from 'mongoose';

export interface IFeatureManifest extends Document {
  featureId: string; // e.g. 'vol3.feature.event_spine', 'vol3.feature.kaam_chain'
  version: string;   // e.g. '1.0.0'
  name: string;
  volume: number;    // 1, 2, or 3
  dependencies: string[]; // IDs of other required features
  eventsPublished: string[];
  eventsConsumed: string[];
  widgetsContributed: string[];
  attentionCost: {
    promptsPerShift: number;
    extraTapsPerTask: number;
    pushNotificationsPerDay: number;
  };
  expertReviewTags: string[]; // e.g. ['LEGAL-REVIEW', 'EXPERT-REVIEW', 'NEEDS-NATIVE-REVIEW']
  isEnabledByDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FeatureManifestSchema = new Schema<IFeatureManifest>(
  {
    featureId: { type: String, required: true, unique: true, index: true },
    version: { type: String, required: true, default: '1.0.0' },
    name: { type: String, required: true },
    volume: { type: Number, required: true, enum: [1, 2, 3] },
    dependencies: [{ type: String }],
    eventsPublished: [{ type: String }],
    eventsConsumed: [{ type: String }],
    widgetsContributed: [{ type: String }],
    attentionCost: {
      promptsPerShift: { type: Number, default: 0 },
      extraTapsPerTask: { type: Number, default: 0 },
      pushNotificationsPerDay: { type: Number, default: 0 },
    },
    expertReviewTags: [{ type: String }],
    isEnabledByDefault: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const FeatureManifest = mongoose.model<IFeatureManifest>('FeatureManifest', FeatureManifestSchema);
