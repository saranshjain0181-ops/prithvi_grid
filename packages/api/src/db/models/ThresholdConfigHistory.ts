import { Schema, model, Document, Types } from 'mongoose';

export interface IThresholdValues {
  tempMin: number;
  tempMax: number;
  moistureMin: number;
  moistureMax: number;
  phAcidCrash: number;
  methaneAlert: number;
  methaneCritical: number;
  pressureCompactionAlert: number;
  verificationWaitMinutes: number;
  nodeOfflineMinutes: number;
}

export interface ISimulationSummary {
  evaluatedSampleCount: number;
  baselineAlerts: number;
  simulatedAlerts: number;
  alertDeltaPct: number;
  compliancePassRateBaselinePct: number;
  compliancePassRateSimulatedPct: number;
  affectedPitsCount: number;
}

export interface IThresholdConfigHistory extends Document {
  version: number;
  thresholds: IThresholdValues;
  simulationSummary?: ISimulationSummary;
  status: 'DRAFT' | 'SIMULATED' | 'ACTIVE' | 'ARCHIVED';
  notes: string;
  deployedAt?: Date;
  deployedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ThresholdConfigHistorySchema = new Schema<IThresholdConfigHistory>(
  {
    version: { type: Number, required: true, index: true },
    thresholds: {
      tempMin: { type: Number, default: 55 },
      tempMax: { type: Number, default: 65 },
      moistureMin: { type: Number, default: 40 },
      moistureMax: { type: Number, default: 60 },
      phAcidCrash: { type: Number, default: 5.2 },
      methaneAlert: { type: Number, default: 300 },
      methaneCritical: { type: Number, default: 450 },
      pressureCompactionAlert: { type: Number, default: 1015 },
      verificationWaitMinutes: { type: Number, default: 15 },
      nodeOfflineMinutes: { type: Number, default: 240 },
    },
    simulationSummary: {
      evaluatedSampleCount: { type: Number },
      baselineAlerts: { type: Number },
      simulatedAlerts: { type: Number },
      alertDeltaPct: { type: Number },
      compliancePassRateBaselinePct: { type: Number },
      compliancePassRateSimulatedPct: { type: Number },
      affectedPitsCount: { type: Number },
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SIMULATED', 'ACTIVE', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },
    notes: { type: String, default: '' },
    deployedAt: { type: Date },
    deployedBy: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster' },
  },
  { timestamps: true }
);

export const ThresholdConfigHistory = model<IThresholdConfigHistory>(
  'ThresholdConfigHistory',
  ThresholdConfigHistorySchema
);
