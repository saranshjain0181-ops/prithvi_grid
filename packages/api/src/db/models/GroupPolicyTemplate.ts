import { Schema, model, Document, Types } from 'mongoose';

export interface IGroupPolicyTemplate extends Document {
  groupId: Types.ObjectId; // Root GlobalEntity or enterprise group
  templateName: string;
  version: number;
  isActive: boolean;
  standardRules: {
    minimumTurningFrequencyHours: number;
    maxAllowedMethanePpm: number;
    targetTempMinC: number;
    targetTempMaxC: number;
    dailyIntakeLogDeadlineHour: number;
    requirePhotoVerification: boolean;
  };
  assignedFacilityIds: Types.ObjectId[];
  allowedPropertyOverrides: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const GroupPolicyTemplateSchema = new Schema<IGroupPolicyTemplate>({
  groupId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
  templateName: { type: String, required: true },
  version: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  standardRules: {
    minimumTurningFrequencyHours: { type: Number, default: 72 },
    maxAllowedMethanePpm: { type: Number, default: 250 },
    targetTempMinC: { type: Number, default: 55 },
    targetTempMaxC: { type: Number, default: 65 },
    dailyIntakeLogDeadlineHour: { type: Number, default: 18 },
    requirePhotoVerification: { type: Boolean, default: true },
  },
  assignedFacilityIds: [{ type: Schema.Types.ObjectId, ref: 'FacilityLocation' }],
  allowedPropertyOverrides: [{ type: String }],
}, { timestamps: true });

export const GroupPolicyTemplate = model<IGroupPolicyTemplate>('GroupPolicyTemplate', GroupPolicyTemplateSchema);
