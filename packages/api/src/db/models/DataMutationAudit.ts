import { Schema, model, Document, Types } from 'mongoose';

export interface IDataMutationAudit extends Document {
  collectionName: string;
  documentId: Types.ObjectId;
  fieldName: string;
  previousValue: any;
  newValue: any;
  versionBefore: number;
  versionAfter: number;
  modifiedBy: {
    userId?: Types.ObjectId;
    name?: string;
    role?: string;
    ipAddress?: string;
  };
  reason?: string;
  createdAt: Date;
}

const DataMutationAuditSchema = new Schema<IDataMutationAudit>(
  {
    collectionName: { type: String, required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, required: true, index: true },
    fieldName: { type: String, required: true },
    previousValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    versionBefore: { type: Number, required: true },
    versionAfter: { type: Number, required: true },
    modifiedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster' },
      name: { type: String },
      role: { type: String },
      ipAddress: { type: String },
    },
    reason: { type: String, default: 'Data Lake Admin Modification' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

DataMutationAuditSchema.index({ collectionName: 1, documentId: 1, createdAt: -1 });

export const DataMutationAudit = model<IDataMutationAudit>(
  'DataMutationAudit',
  DataMutationAuditSchema
);
