import mongoose, { Document, Schema } from 'mongoose';
import { CompostingPhase, PhaseExceptionState } from './PhaseProfile.js';

export interface IPitSwimlaneItem {
  pitId: string;
  batchId: string;
  phase: CompostingPhase;
  exceptionState?: PhaseExceptionState;
  daysActive: number;
  expectedHarvestDays: number;
  trajectoryStatus: 'ON_TRACK' | 'RUNNING_COOL' | 'RUNNING_HOT' | 'OFF_TRAJECTORY';
  confidencePct: number;
}

export interface IBiologyNeedsItem {
  pitId: string;
  actionRequired: 'WATER_ADDITION' | 'BULKING_ADDITION' | 'HEAT_SPREAD' | 'LEAVE_UNDISTURBED' | 'SAMPLE_TEST_DUE';
  urgency: 'ROUTINE' | 'ELEVATED' | 'CRITICAL';
  summaryHindi: string;
}

export interface IBioprocessBoardSnapshotRecord extends Document {
  snapshotId: string;
  facilityId: string;
  asOfDate: string; // YYYY-MM-DD
  swimlane: IPitSwimlaneItem[];
  needsNow: IBiologyNeedsItem[];
  pipelineCounts: {
    loadingCount: number;
    thermophilicCount: number;
    coolingCount: number;
    curingCount: number;
    readyCount: number;
  };
  qualitySummary: {
    batchesWithStrongThermalEvidence: number;
    batchesReadyForHarvest: number;
    storedLotsAtNitrogenRisk: number;
  };
  createdAt: Date;
}

const BioprocessBoardSnapshotSchema = new Schema<IBioprocessBoardSnapshotRecord>(
  {
    snapshotId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    asOfDate: { type: String, required: true, index: true },
    swimlane: [
      {
        pitId: { type: String, required: true },
        batchId: { type: String, required: true },
        phase: { type: String, required: true },
        exceptionState: { type: String },
        daysActive: { type: Number, required: true },
        expectedHarvestDays: { type: Number, required: true },
        trajectoryStatus: { type: String, required: true },
        confidencePct: { type: Number, required: true },
      },
    ],
    needsNow: [
      {
        pitId: { type: String, required: true },
        actionRequired: { type: String, required: true },
        urgency: { type: String, required: true },
        summaryHindi: { type: String, required: true },
      },
    ],
    pipelineCounts: {
      loadingCount: { type: Number, default: 0 },
      thermophilicCount: { type: Number, default: 0 },
      coolingCount: { type: Number, default: 0 },
      curingCount: { type: Number, default: 0 },
      readyCount: { type: Number, default: 0 },
    },
    qualitySummary: {
      batchesWithStrongThermalEvidence: { type: Number, default: 0 },
      batchesReadyForHarvest: { type: Number, default: 0 },
      storedLotsAtNitrogenRisk: { type: Number, default: 0 },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const BioprocessBoardSnapshot = mongoose.model<IBioprocessBoardSnapshotRecord>(
  'BioprocessBoardSnapshot',
  BioprocessBoardSnapshotSchema
);
