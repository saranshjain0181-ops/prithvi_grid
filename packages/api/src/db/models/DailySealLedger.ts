import { Schema, model, Document, Types } from 'mongoose';

export interface IMerkleLeafRecord {
  recordType: 'TELEMETRY' | 'LABOUR_CLAIM' | 'MANAGER_OVERRIDE' | 'CALIBRATION' | 'WEIGHT_LOG' | 'DOCUMENT';
  recordId: Types.ObjectId;
  canonicalHash: string; // SHA-256 of canonical JSON (64 hex characters)
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface IDailySealLedger extends Document {
  tenantId: Types.ObjectId;
  facilityId: Types.ObjectId;
  sealDate: string; // Format: YYYY-MM-DD
  merkleRoot: string; // 64-char hex SHA-256
  previousSealHash: string; // Chained parent day seal hash
  leafCount: number;
  leaves: IMerkleLeafRecord[];
  isAmended: boolean;
  amendmentCount: number;
  externalAnchorId?: string; // Optional external RFC 3161 / TSA receipt ID
  sealedAt: Date;
  status: 'SEALED' | 'AMENDED_AFTER_SEAL';
  amendmentHistory?: Array<{
    amendedAt: Date;
    amendedBy: Types.ObjectId;
    reason: string;
    overrideRecordId: Types.ObjectId;
    previousLeafHash: string;
    newLeafHash: string;
  }>;
}

const MerkleLeafSchema = new Schema<IMerkleLeafRecord>({
  recordType: {
    type: String,
    enum: ['TELEMETRY', 'LABOUR_CLAIM', 'MANAGER_OVERRIDE', 'CALIBRATION', 'WEIGHT_LOG', 'DOCUMENT'],
    required: true,
  },
  recordId: { type: Schema.Types.ObjectId, required: true },
  canonicalHash: { type: String, required: true, length: 64 },
  timestamp: { type: Date, required: true },
  metadata: { type: Schema.Types.Mixed },
}, { _id: false });

export const DailySealLedgerSchema = new Schema<IDailySealLedger>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
  sealDate: { type: String, required: true },
  merkleRoot: { type: String, required: true, length: 64 },
  previousSealHash: { type: String, required: true, length: 64 },
  leafCount: { type: Number, required: true, min: 0 },
  leaves: [MerkleLeafSchema],
  isAmended: { type: Boolean, default: false },
  amendmentCount: { type: Number, default: 0 },
  externalAnchorId: { type: String },
  sealedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['SEALED', 'AMENDED_AFTER_SEAL'],
    default: 'SEALED',
  },
  amendmentHistory: [{
    amendedAt: { type: Date, default: Date.now },
    amendedBy: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster' },
    reason: { type: String, required: true },
    overrideRecordId: { type: Schema.Types.ObjectId, required: true },
    previousLeafHash: { type: String, required: true },
    newLeafHash: { type: String, required: true },
  }],
}, { timestamps: true });

DailySealLedgerSchema.index({ tenantId: 1, facilityId: 1, sealDate: 1 }, { unique: true });

export const DailySealLedger = model<IDailySealLedger>('DailySealLedger', DailySealLedgerSchema);
