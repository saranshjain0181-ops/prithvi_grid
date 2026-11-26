import mongoose, { Document, Schema } from 'mongoose';

export type ConfigScope = 'GLOBAL' | 'GROUP' | 'FACILITY' | 'PIT';

export interface IConfigVersion extends Document {
  configKey: string;
  scope: ConfigScope;
  scopeId: string;
  version: number;
  configJson: string; // Deterministic canonical JSON
  changeSummary: string;
  modifiedBy: string;
  effectiveFrom: Date;
  status: 'ACTIVE' | 'ARCHIVED';
  auditSignature: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConfigTimeMachineSchema = new Schema<IConfigVersion>(
  {
    configKey: { type: String, required: true, index: true },
    scope: {
      type: String,
      required: true,
      enum: ['GLOBAL', 'GROUP', 'FACILITY', 'PIT'],
      index: true,
    },
    scopeId: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    configJson: { type: String, required: true },
    changeSummary: { type: String, required: true },
    modifiedBy: { type: String, required: true },
    effectiveFrom: { type: Date, default: Date.now },
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
    auditSignature: { type: String, required: true },
  },
  { timestamps: true }
);

ConfigTimeMachineSchema.index({ configKey: 1, scope: 1, scopeId: 1, version: -1 });

export const ConfigTimeMachine = mongoose.model<IConfigVersion>(
  'ConfigTimeMachine',
  ConfigTimeMachineSchema
);
