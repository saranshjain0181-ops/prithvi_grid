import { Schema, model, Document, Types } from 'mongoose';

export type VerificationStatus =
  | 'PENDING'
  | 'VERIFIED_GENUINE'
  | 'FAKE_FLAG'
  | 'INCONCLUSIVE'
  | 'MANAGER_OVERRIDE';

export type ActionType =
  | 'WASTE_COLLECTION'
  | 'TURNING'
  | 'WATERING'
  | 'HARVESTING'
  | 'INSPECTION'
  | 'MAINTENANCE'
  | string;

export interface ISensorDelta {
  temp: number;
  moisture: number;
  pressure: number;
}

export interface ILabourExecutionLedger extends Document {
  entityId: Types.ObjectId;
  facilityId: Types.ObjectId;
  labourId: Types.ObjectId;       // ref: UserAuthRoster (SAFAI_MITRA)
  managerId?: Types.ObjectId;     // ref: UserAuthRoster (BWG_MANAGER)
  nodeId: Types.ObjectId;         // ref: PhysicalAsset (IOT_NODE)
  boxId: Types.ObjectId;          // ref: PhysicalAsset (COMPOST_BOX)
  actionType: string;
  scheduledAt?: Date;
  executedAt: Date;
  verificationStatus: VerificationStatus;
  confidenceScore?: number;       // 0 - 100% confidence based on sensor packet availability
  inconclusiveReason?: string;    // Diagnostic explanation when status is INCONCLUSIVE
  sensorDelta?: ISensorDelta;
  /** Telemetry snapshot at execution time */
  telemetryAtT0?: {
    tempC: number;
    moisturePct: number;
    airPressureHpa: number;
  };
  /** Telemetry snapshot after 15-min window */
  telemetryAtT15?: {
    tempC: number;
    moisturePct: number;
    airPressureHpa: number;
  };
  verifiedAt?: Date;
  overrideBy?: Types.ObjectId;
  overrideReason?: string;
  /** BullMQ job ID for the verification task */
  queueJobId?: string;
  notes?: string;
  qrCode?: string;
  gpsLocation?: {
    lat: number;
    long: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SensorDeltaSchema = new Schema<ISensorDelta>(
  {
    temp: { type: Number },
    moisture: { type: Number },
    pressure: { type: Number },
  },
  { _id: false }
);

const LabourExecutionLedgerSchema = new Schema<ILabourExecutionLedger>(
  {
    entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
    facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
    labourId: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster', required: true, index: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster' },
    nodeId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, index: true },
    boxId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, index: true },
    actionType: {
      type: String,
      required: true,
      index: true,
    },
    scheduledAt: { type: Date },
    executedAt: { type: Date, required: true, default: Date.now },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED_GENUINE', 'FAKE_FLAG', 'INCONCLUSIVE', 'MANAGER_OVERRIDE'],
      default: 'PENDING',
      index: true,
    },
    confidenceScore: { type: Number, default: 0 },
    inconclusiveReason: { type: String },
    sensorDelta: { type: SensorDeltaSchema },
    telemetryAtT0: {
      tempC: { type: Number },
      moisturePct: { type: Number },
      airPressureHpa: { type: Number },
    },
    telemetryAtT15: {
      tempC: { type: Number },
      moisturePct: { type: Number },
      airPressureHpa: { type: Number },
    },
    verifiedAt: { type: Date },
    overrideBy: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster' },
    overrideReason: { type: String },
    queueJobId: { type: String },
    notes: { type: String },
    qrCode: { type: String },
    gpsLocation: {
      lat: { type: Number },
      long: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for labour and manager dashboards
LabourExecutionLedgerSchema.index({ labourId: 1, executedAt: -1 });
LabourExecutionLedgerSchema.index({ facilityId: 1, executedAt: -1 });
LabourExecutionLedgerSchema.index({ entityId: 1, executedAt: -1 });
LabourExecutionLedgerSchema.index({ verificationStatus: 1, executedAt: -1 });

export const LabourExecutionLedger = model<ILabourExecutionLedger>(
  'LabourExecutionLedger',
  LabourExecutionLedgerSchema
);
