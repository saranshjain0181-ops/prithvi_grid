import mongoose, { Document, Schema } from 'mongoose';

export type MetricCategory = 'OPERATIONAL' | 'SUSTAINABILITY' | 'COMPLIANCE' | 'FINANCIAL';

export interface IMetricDefinition extends Document {
  metricKey: string;
  displayName: string;
  category: MetricCategory;
  certifiedFormula: string;
  unit: string;
  isEstimated: boolean;
  governanceApproved: boolean;
  description: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MetricDictionarySchema = new Schema<IMetricDefinition>(
  {
    metricKey: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['OPERATIONAL', 'SUSTAINABILITY', 'COMPLIANCE', 'FINANCIAL'],
      index: true,
    },
    certifiedFormula: { type: String, required: true },
    unit: { type: String, required: true },
    isEstimated: { type: Boolean, default: false },
    governanceApproved: { type: Boolean, default: true },
    description: { type: String, required: true },
    approvedBy: { type: String },
  },
  { timestamps: true }
);

export const MetricDictionary = mongoose.model<IMetricDefinition>(
  'MetricDictionary',
  MetricDictionarySchema
);
