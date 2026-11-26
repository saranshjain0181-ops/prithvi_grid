import mongoose, { Document, Schema } from 'mongoose';

export type HqDepartmentType = 'FLEET_FIELD_SERVICE' | 'CUSTOMER_SUCCESS' | 'FINANCE_COMMERCIAL' | 'PLATFORM_AI_OPS';

export interface IHqTicketHandoff {
  handoffId: string;
  sourceDepartment: HqDepartmentType;
  targetDepartment: HqDepartmentType;
  title: string;
  facilityId: string;
  priority: 'ROUTINE' | 'ELEVATED' | 'CRITICAL';
  status: 'PENDING' | 'ACCEPTED' | 'COMPLETED';
  routedAt: Date;
  resolvedAt?: Date;
}

export interface IHqDepartmentStateRecord extends Document {
  stateId: string;
  department: HqDepartmentType;
  asOfDate: string; // YYYY-MM-DD
  activeKpiName: string;
  activeKpiValue: string;
  kpiHealth: 'HEALTHY' | 'WARNING' | 'ALERT';
  openIssuesCount: number;
  handoffsQueue: IHqTicketHandoff[];
  createdAt: Date;
}

const HqDepartmentStateSchema = new Schema<IHqDepartmentStateRecord>(
  {
    stateId: { type: String, required: true, unique: true, index: true },
    department: {
      type: String,
      required: true,
      enum: ['FLEET_FIELD_SERVICE', 'CUSTOMER_SUCCESS', 'FINANCE_COMMERCIAL', 'PLATFORM_AI_OPS'],
    },
    asOfDate: { type: String, required: true, index: true },
    activeKpiName: { type: String, required: true },
    activeKpiValue: { type: String, required: true },
    kpiHealth: { type: String, required: true, enum: ['HEALTHY', 'WARNING', 'ALERT'] },
    openIssuesCount: { type: Number, default: 0 },
    handoffsQueue: [
      {
        handoffId: { type: String, required: true },
        sourceDepartment: { type: String, required: true },
        targetDepartment: { type: String, required: true },
        title: { type: String, required: true },
        facilityId: { type: String, required: true },
        priority: { type: String, required: true, enum: ['ROUTINE', 'ELEVATED', 'CRITICAL'] },
        status: {
          type: String,
          required: true,
          enum: ['PENDING', 'ACCEPTED', 'COMPLETED'],
          default: 'PENDING',
        },
        routedAt: { type: Date, required: true },
        resolvedAt: { type: Date },
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const HqDepartmentState = mongoose.model<IHqDepartmentStateRecord>(
  'HqDepartmentState',
  HqDepartmentStateSchema
);
