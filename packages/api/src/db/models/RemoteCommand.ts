import { Schema, model, Document, Types } from 'mongoose';

export type RemoteCommandType =
  | 'BUZZER_MUTE'
  | 'LED_STROBE'
  | 'SET_BURST_INTERVAL'
  | 'REBOOT'
  | 'DIAGNOSTIC_PING'
  | 'OTA_TRIGGER';

export type RemoteCommandStatus = 'PENDING' | 'DISPATCHED' | 'ACKNOWLEDGED' | 'EXPIRED';

export interface IRemoteCommand extends Document {
  nodeId: Types.ObjectId;
  facilityId: Types.ObjectId;
  entityId: Types.ObjectId;
  command: RemoteCommandType;
  payload?: Record<string, any>;
  status: RemoteCommandStatus;
  issuedBy?: Types.ObjectId;
  dispatchedAt?: Date;
  acknowledgedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RemoteCommandSchema = new Schema<IRemoteCommand>(
  {
    nodeId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, index: true },
    facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
    command: {
      type: String,
      enum: ['BUZZER_MUTE', 'LED_STROBE', 'SET_BURST_INTERVAL', 'REBOOT', 'DIAGNOSTIC_PING', 'OTA_TRIGGER'],
      required: true,
      index: true,
    },
    payload: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['PENDING', 'DISPATCHED', 'ACKNOWLEDGED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster' },
    dispatchedAt: { type: Date },
    acknowledgedAt: { type: Date },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours expiry
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly fetch pending commands for a waking node
RemoteCommandSchema.index({ nodeId: 1, status: 1 });

export const RemoteCommand = model<IRemoteCommand>('RemoteCommand', RemoteCommandSchema);

export async function enqueueRemoteCommand(input: {
  nodeId: string | Types.ObjectId;
  command: RemoteCommandType;
  payload?: Record<string, any>;
  issuedBy?: string | Types.ObjectId;
  facilityId?: string | Types.ObjectId;
  entityId?: string | Types.ObjectId;
  expiresInHours?: number;
}): Promise<IRemoteCommand> {
  let facilityId = input.facilityId;
  let entityId = input.entityId;

  if (!facilityId || !entityId) {
    const { PhysicalAsset } = await import('./PhysicalAsset');
    const asset = await PhysicalAsset.findById(input.nodeId);
    if (asset) {
      facilityId = facilityId || asset.facilityId;
      entityId = entityId || asset.entityId;
    }
  }

  const expiresAt = new Date(Date.now() + (input.expiresInHours || 24) * 3600 * 1000);

  const cmd = await RemoteCommand.create({
    nodeId: input.nodeId,
    facilityId: facilityId || new Types.ObjectId(),
    entityId: entityId || new Types.ObjectId(),
    command: input.command,
    payload: input.payload,
    issuedBy: input.issuedBy && Types.ObjectId.isValid(input.issuedBy) ? new Types.ObjectId(input.issuedBy) : undefined,
    status: 'PENDING',
    expiresAt,
  });

  return cmd;
}

