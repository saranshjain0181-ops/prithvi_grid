import { Schema, model, Document, Types } from 'mongoose';

export interface IProximityProof extends Document {
  workerId: Types.ObjectId;
  nodeId: Types.ObjectId;
  pitId: Types.ObjectId;
  facilityId: Types.ObjectId;
  nonce: string; // Anti-replay random challenge
  workerHash: string;
  nodeTimestamp: Date;
  readingsSnapshot: {
    tempC: number;
    moisturePct: number;
    ph: number;
    methanePpm: number;
    supercapMv: number;
  };
  signature: string; // Cryptographic signature from node
  verificationStatus: 'VALID' | 'REPLAY_ATTEMPT' | 'INVALID_SIGNATURE';
  syncedFromOffline: boolean;
  receivedAt: Date;
}

export const ProximityProofSchema = new Schema<IProximityProof>({
  workerId: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster', required: true, index: true },
  nodeId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, index: true },
  pitId: { type: Schema.Types.ObjectId, ref: 'PhysicalAsset', required: true, index: true },
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
  nonce: { type: String, required: true, unique: true, index: true },
  workerHash: { type: String, required: true },
  nodeTimestamp: { type: Date, required: true },
  readingsSnapshot: {
    tempC: { type: Number, required: true },
    moisturePct: { type: Number, required: true },
    ph: { type: Number, required: true },
    methanePpm: { type: Number, required: true },
    supercapMv: { type: Number, required: true },
  },
  signature: { type: String, required: true },
  verificationStatus: {
    type: String,
    enum: ['VALID', 'REPLAY_ATTEMPT', 'INVALID_SIGNATURE'],
    default: 'VALID',
  },
  syncedFromOffline: { type: Boolean, default: false },
  receivedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const ProximityProof = model<IProximityProof>('ProximityProof', ProximityProofSchema);
