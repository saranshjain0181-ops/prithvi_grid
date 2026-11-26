import mongoose, { Document, Schema } from 'mongoose';

export interface ISupervisorRoundStop {
  stopOrder: number;
  locationId: string; // pitId, zoneId
  targetType: 'PIT_RISK' | 'SENSE_CHECK_DUE' | 'MAPPING_ROUND' | 'COVER_AUDIT' | 'NODE_CARE';
  reason: string;
  isCompleted: boolean;
  completedAt?: Date;
}

export interface IWaitingApprovalItem {
  itemId: string;
  itemType: 'PRACTICAL_SIGNOFF' | 'SUPERVISED_WORK_OVERRIDE' | 'CORRECTION_APPROVAL' | 'GATE_REJECTION';
  submittedBy: string;
  summary: string;
  createdAt: Date;
}

export interface ISupervisorFieldBoardRecord extends Document {
  supervisorId: string;
  facilityId: string;
  shiftDate: string;
  rounds: ISupervisorRoundStop[];
  waitingApprovals: IWaitingApprovalItem[];
  teamMembersPresent: number;
  heatAdvisoryRestMinutes: number;
  updatedAt: Date;
}

const SupervisorFieldBoardSchema = new Schema<ISupervisorFieldBoardRecord>(
  {
    supervisorId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    shiftDate: { type: String, required: true, index: true },
    rounds: [
      {
        stopOrder: { type: Number, required: true },
        locationId: { type: String, required: true },
        targetType: {
          type: String,
          required: true,
          enum: ['PIT_RISK', 'SENSE_CHECK_DUE', 'MAPPING_ROUND', 'COVER_AUDIT', 'NODE_CARE'],
        },
        reason: { type: String, required: true },
        isCompleted: { type: Boolean, default: false },
        completedAt: { type: Date },
      },
    ],
    waitingApprovals: [
      {
        itemId: { type: String, required: true },
        itemType: {
          type: String,
          required: true,
          enum: ['PRACTICAL_SIGNOFF', 'SUPERVISED_WORK_OVERRIDE', 'CORRECTION_APPROVAL', 'GATE_REJECTION'],
        },
        submittedBy: { type: String, required: true },
        summary: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    teamMembersPresent: { type: Number, default: 0 },
    heatAdvisoryRestMinutes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SupervisorFieldBoardSchema.index({ supervisorId: 1, facilityId: 1, shiftDate: 1 });

export const SupervisorFieldBoard = mongoose.model<ISupervisorFieldBoardRecord>(
  'SupervisorFieldBoard',
  SupervisorFieldBoardSchema
);
