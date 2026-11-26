import { Schema, model, Document, Types } from 'mongoose';

export interface IAccessLogDoc extends Document {
  userId?: Types.ObjectId;
  entityId?: Types.ObjectId;
  facilityId?: Types.ObjectId;
  ip: string;
  userAgent?: string;
  action: string;
  status: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  details?: Record<string, any>;
  at: Date;
}

const AccessLogSchema = new Schema<IAccessLogDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster', index: true },
    entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', index: true },
    facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation' },
    ip: { type: String, required: true, index: true },
    userAgent: { type: String },
    action: { type: String, required: true, index: true },
    status: { type: String, enum: ['SUCCESS', 'FAILURE', 'BLOCKED'], default: 'SUCCESS' },
    details: { type: Schema.Types.Mixed },
    at: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Compound indexes for enterprise security queries
AccessLogSchema.index({ entityId: 1, at: -1 });
AccessLogSchema.index({ userId: 1, at: -1 });
AccessLogSchema.index({ ip: 1, at: -1 });

export const AccessLog = model<IAccessLogDoc>('AccessLog', AccessLogSchema);
