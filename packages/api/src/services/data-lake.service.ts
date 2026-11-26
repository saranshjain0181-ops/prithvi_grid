import { Model, Types } from 'mongoose';
import { GlobalEntity } from '../db/models/GlobalEntity';
import { FacilityLocation } from '../db/models/FacilityLocation';
import { UserAuthRoster } from '../db/models/UserAuthRoster';
import { PhysicalAsset } from '../db/models/PhysicalAsset';
import { LiveTelemetry } from '../db/models/LiveTelemetry';
import { LabourExecutionLedger } from '../db/models/LabourExecutionLedger';
import { KhadKachraFlow } from '../db/models/KhadKachraFlow';
import { AiAlertSanjivani } from '../db/models/AiAlertSanjivani';
import { SwmComplianceArchive } from '../db/models/SwmComplianceArchive';
import { CompostBatch } from '../db/models/CompostBatch';
import { DataMutationAudit } from '../db/models/DataMutationAudit';

export type DataLakeCollectionKey =
  | 'ENTITIES'
  | 'FACILITIES'
  | 'ROSTER'
  | 'ASSETS'
  | 'TELEMETRY'
  | 'LEDGER'
  | 'DIARY'
  | 'SANJIVANI'
  | 'COMPLIANCE'
  | 'BATCHES';

const MODEL_MAP: Record<DataLakeCollectionKey, Model<any>> = {
  ENTITIES: GlobalEntity,
  FACILITIES: FacilityLocation,
  ROSTER: UserAuthRoster,
  ASSETS: PhysicalAsset,
  TELEMETRY: LiveTelemetry,
  LEDGER: LabourExecutionLedger,
  DIARY: KhadKachraFlow,
  SANJIVANI: AiAlertSanjivani,
  COMPLIANCE: SwmComplianceArchive,
  BATCHES: CompostBatch,
};

export class OptimisticLockConflictError extends Error {
  currentRecord: any;
  constructor(message: string, currentRecord: any) {
    super(message);
    this.name = 'OptimisticLockConflictError';
    this.currentRecord = currentRecord;
  }
}

export interface ListRowsOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Fetch paginated live rows from any Data Lake collection
 */
export async function listCollectionRows(
  collectionKey: DataLakeCollectionKey,
  options: ListRowsOptions = {}
) {
  const model = MODEL_MAP[collectionKey];
  if (!model) {
    throw new Error(`Invalid Data Lake collection key: ${collectionKey}`);
  }

  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 15));
  const skip = (page - 1) * limit;

  const query: any = {};
  if (options.search && options.search.trim()) {
    const s = options.search.trim();
    // Generic regex search across common string fields
    query.$or = [
      { name: { $regex: s, $options: 'i' } },
      { orgName: { $regex: s, $options: 'i' } },
      { facilityName: { $regex: s, $options: 'i' } },
      { phone: { $regex: s, $options: 'i' } },
      { assetCode: { $regex: s, $options: 'i' } },
    ];
  }

  const sortField = options.sortBy || 'createdAt';
  const sortDirection = options.sortOrder === 'asc' ? 1 : -1;

  const [total, rows] = await Promise.all([
    model.countDocuments(query),
    model
      .find(query)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    collectionKey,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    rows: rows.map((r: any) => ({
      ...r,
      _id: r._id?.toString(),
      version: r.__v ?? 0,
    })),
  };
}

/**
 * Update a record with strict optimistic locking and mutation audit trail
 */
export async function updateRecordOptimistic(
  collectionKey: DataLakeCollectionKey,
  id: string,
  updates: Record<string, any>,
  expectedVersion: number,
  modifier: { userId?: string; name?: string; role?: string; ipAddress?: string }
) {
  const model = MODEL_MAP[collectionKey];
  if (!model) {
    throw new Error(`Invalid Data Lake collection key: ${collectionKey}`);
  }

  const doc = await model.findById(id);
  if (!doc) {
    throw new Error(`Document not found in ${collectionKey}`);
  }

  const currentVersion = doc.__v ?? 0;

  // Strict Optimistic Concurrency Check
  if (currentVersion !== expectedVersion) {
    throw new OptimisticLockConflictError(
      `Conflict: Record was modified by another operator (expected version ${expectedVersion}, but found ${currentVersion}).`,
      doc.toObject()
    );
  }

  const auditEntries = [];

  // Compare and record each modified field
  for (const [key, newVal] of Object.entries(updates)) {
    if (key === '_id' || key === '__v' || key === 'createdAt' || key === 'updatedAt') {
      continue;
    }

    const oldVal = doc.get(key);
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      doc.set(key, newVal);
      auditEntries.push({
        collectionName: collectionKey,
        documentId: doc._id,
        fieldName: key,
        previousValue: oldVal,
        newValue: newVal,
        versionBefore: currentVersion,
        versionAfter: currentVersion + 1,
        modifiedBy: {
          userId: modifier.userId && Types.ObjectId.isValid(modifier.userId) ? new Types.ObjectId(modifier.userId) : undefined,
          name: modifier.name || 'System Operator',
          role: modifier.role || 'SUPREME_HEAD',
          ipAddress: modifier.ipAddress,
        },
      });
    }
  }

  doc.__v = currentVersion + 1;
  await doc.save();

  // Save audit trail entries
  if (auditEntries.length > 0) {
    await DataMutationAudit.insertMany(auditEntries);
  }

  return {
    success: true,
    document: doc.toObject(),
    newVersion: doc.__v,
    mutationsCount: auditEntries.length,
  };
}

/**
 * Fetch audit log for a specific document
 */
export async function getDocumentAuditLog(
  collectionKey: DataLakeCollectionKey,
  documentId: string
) {
  const audits = await DataMutationAudit.find({
    collectionName: collectionKey,
    documentId: new Types.ObjectId(documentId),
  })
    .sort({ createdAt: -1 })
    .lean();

  return audits;
}
