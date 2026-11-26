import mongoose, { Document, Schema } from 'mongoose';

export type ChainStepStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'FAILED' | 'SKIPPED';

export interface IChainStepDefinition {
  stepKey: string;
  name: string;
  triggerEventType?: string; // e.g. 'pit.load.completed'
  ownerRole: string; // e.g. 'SUPERVISOR', 'SAFAI_MITRA', 'OPERATOR'
  requiredCertification?: string; // e.g. 'SHREDDER_OPERATOR'
  expectedDurationMinutes: number;
  slaTimeoutMinutes: number;
  automatedAction?: 'CREATE_TASK' | 'FORCE_NODE_READ' | 'SEND_GOVERNED_PROMPT' | 'CHANGE_BATCH_STAGE';
  branchCondition?: string; // JSON condition e.g. {"field": "isAcidic", "equals": true}
}

export interface IChainStepRun {
  stepKey: string;
  status: ChainStepStatus;
  startedAt?: Date;
  completedAt?: Date;
  actualDurationMinutes?: number;
  assignedToUserId?: string;
  isOverdue: boolean;
  notes?: string;
}

export interface IChainInstance extends Document {
  instanceId: string;
  chainKey: string;
  chainVersion: number;
  tenantId: string;
  facilityId: string;
  entityRefs: Array<{ entityType: string; entityId: string }>;
  status: 'RUNNING' | 'COMPLETED' | 'DELAYED' | 'FAILED' | 'CANCELLED';
  stepRuns: IChainStepRun[];
  currentStepIndex: number;
  totalCycleTimeMinutes: number;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChainInstanceSchema = new Schema<IChainInstance>(
  {
    instanceId: { type: String, required: true, unique: true, index: true },
    chainKey: { type: String, required: true, index: true },
    chainVersion: { type: Number, default: 1 },
    tenantId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    entityRefs: [
      {
        entityType: { type: String, required: true },
        entityId: { type: String, required: true },
      },
    ],
    status: {
      type: String,
      required: true,
      enum: ['RUNNING', 'COMPLETED', 'DELAYED', 'FAILED', 'CANCELLED'],
      default: 'RUNNING',
      index: true,
    },
    stepRuns: [
      {
        stepKey: { type: String, required: true },
        status: {
          type: String,
          required: true,
          enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'OVERDUE', 'FAILED', 'SKIPPED'],
          default: 'PENDING',
        },
        startedAt: { type: Date },
        completedAt: { type: Date },
        actualDurationMinutes: { type: Number },
        assignedToUserId: { type: String },
        isOverdue: { type: Boolean, default: false },
        notes: { type: String },
      },
    ],
    currentStepIndex: { type: Number, default: 0 },
    totalCycleTimeMinutes: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

ChainInstanceSchema.index({ facilityId: 1, status: 1 });

export const ChainInstance = mongoose.model<IChainInstance>('ChainInstance', ChainInstanceSchema);
