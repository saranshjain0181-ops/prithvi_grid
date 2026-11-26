import crypto from 'crypto';
import { Types } from 'mongoose';
import { DailySealLedger, IDailySealLedger, IMerkleLeafRecord } from '../db/models/DailySealLedger';

export interface InclusionProofStep {
  position: 'left' | 'right';
  hash: string;
}

export interface MerkleTreeResult {
  root: string;
  leafCount: number;
  levels: string[][];
}

export interface SealGenerationInput {
  tenantId: string | Types.ObjectId;
  facilityId: string | Types.ObjectId;
  sealDate: string; // YYYY-MM-DD
  records: Array<{
    recordType: IMerkleLeafRecord['recordType'];
    recordId: string | Types.ObjectId;
    payload: Record<string, unknown>;
    timestamp: Date;
  }>;
  previousSealHash?: string;
  externalAnchorId?: string;
}

export interface VerifyInclusionParams {
  leafHash: string;
  merkleRoot: string;
  proof: InclusionProofStep[];
}

export const GENESIS_SEAL_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Deterministically serialize any JavaScript object by sorting keys recursively.
 * Eliminates whitespace discrepancies and key-ordering non-determinism.
 */
export function canonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalJson(item)).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const entries: string[] = [];

  for (const key of sortedKeys) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== undefined) {
      entries.push(`${JSON.stringify(key)}:${canonicalJson(val)}`);
    }
  }

  return '{' + entries.join(',') + '}';
}

/**
 * Computes standard SHA-256 hash in hex format.
 */
export function sha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Computes canonical hash for an evidence-bearing transaction.
 */
export function hashCanonicalRecord(payload: Record<string, unknown>): string {
  return sha256(canonicalJson(payload));
}

/**
 * Constructs a binary Merkle tree from an ordered list of leaf hashes.
 * If an odd number of nodes exists at any level, duplicates the last node.
 */
export function buildMerkleTree(leafHashes: string[]): MerkleTreeResult {
  if (!leafHashes || leafHashes.length === 0) {
    const emptyRoot = sha256('PRITHVI_EMPTY_MERKLE_TREE_LEAF');
    return {
      root: emptyRoot,
      leafCount: 0,
      levels: [[emptyRoot]],
    };
  }

  const levels: string[][] = [];
  let currentLevel = [...leafHashes];
  levels.push(currentLevel);

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      const combined = sha256(left + right);
      nextLevel.push(combined);
    }
    levels.push(nextLevel);
    currentLevel = nextLevel;
  }

  return {
    root: levels[levels.length - 1][0],
    leafCount: leafHashes.length,
    levels,
  };
}

/**
 * Generates an audit inclusion proof for a specific leaf in the Merkle tree.
 */
export function generateInclusionProof(
  targetLeafHash: string,
  leafHashes: string[]
): InclusionProofStep[] {
  let index = leafHashes.indexOf(targetLeafHash);
  if (index === -1) {
    throw new Error(`Leaf hash ${targetLeafHash} not found in provided leaf list.`);
  }

  const tree = buildMerkleTree(leafHashes);
  const proof: InclusionProofStep[] = [];

  for (let levelIndex = 0; levelIndex < tree.levels.length - 1; levelIndex++) {
    const currentLevel = tree.levels[levelIndex];
    const isRightChild = index % 2 === 1;
    const siblingIndex = isRightChild ? index - 1 : (index + 1 < currentLevel.length ? index + 1 : index);

    const siblingHash = currentLevel[siblingIndex];
    proof.push({
      position: isRightChild ? 'left' : 'right',
      hash: siblingHash,
    });

    index = Math.floor(index / 2);
  }

  return proof;
}

/**
 * Verifies an inclusion proof against the known Merkle root.
 */
export function verifyInclusionProof(params: VerifyInclusionParams): boolean {
  const { leafHash, merkleRoot, proof } = params;
  let currentHash = leafHash;

  for (const step of proof) {
    if (step.position === 'right') {
      currentHash = sha256(currentHash + step.hash);
    } else {
      currentHash = sha256(step.hash + currentHash);
    }
  }

  return currentHash === merkleRoot;
}

/**
 * Computes chained daily seal hash connecting current root to previous day's seal hash.
 */
export function computeDailySealHash(
  tenantId: string,
  facilityId: string,
  sealDate: string,
  merkleRoot: string,
  previousSealHash: string
): string {
  const payload = `${tenantId}:${facilityId}:${sealDate}:${merkleRoot}:${previousSealHash}`;
  return sha256(payload);
}

export class MerkleSealService {
  /**
   * Seals a full operational day for a tenant facility.
   * Chained to the previous day's seal hash.
   */
  public async generateDailySeal(input: SealGenerationInput): Promise<IDailySealLedger> {
    const tenantObjId = new Types.ObjectId(input.tenantId.toString());
    const facilityObjId = new Types.ObjectId(input.facilityId.toString());

    // 1. Resolve previous day seal hash
    let prevHash = input.previousSealHash;
    if (!prevHash) {
      const lastSeal = await DailySealLedger.findOne({
        tenantId: tenantObjId,
        facilityId: facilityObjId,
      }).sort({ sealDate: -1 });

      prevHash = lastSeal ? lastSeal.merkleRoot : GENESIS_SEAL_HASH;
    }

    // 2. Hash each canonical leaf record
    const leaves: IMerkleLeafRecord[] = input.records.map((r) => ({
      recordType: r.recordType,
      recordId: new Types.ObjectId(r.recordId.toString()),
      canonicalHash: hashCanonicalRecord(r.payload),
      timestamp: r.timestamp,
    }));

    const leafHashes = leaves.map((l) => l.canonicalHash);
    const tree = buildMerkleTree(leafHashes);

    // 3. Persist or upsert daily seal ledger entry
    const sealDoc = await DailySealLedger.findOneAndUpdate(
      {
        tenantId: tenantObjId,
        facilityId: facilityObjId,
        sealDate: input.sealDate,
      },
      {
        merkleRoot: tree.root,
        previousSealHash: prevHash,
        leafCount: tree.leafCount,
        leaves,
        isAmended: false,
        amendmentCount: 0,
        externalAnchorId: input.externalAnchorId,
        sealedAt: new Date(),
        status: 'SEALED',
      },
      { upsert: true, new: true }
    );

    return sealDoc;
  }

  /**
   * Records a non-destructive post-seal amendment when manager edits historical data.
   * Preserves historical integrity while flagging the document as AMENDED_AFTER_SEAL.
   */
  public async recordPostSealAmendment(params: {
    tenantId: string | Types.ObjectId;
    facilityId: string | Types.ObjectId;
    sealDate: string;
    amendedBy: string | Types.ObjectId;
    reason: string;
    overrideRecordId: string | Types.ObjectId;
    previousLeafHash: string;
    newPayload: Record<string, unknown>;
  }): Promise<IDailySealLedger> {
    const tenantObjId = new Types.ObjectId(params.tenantId.toString());
    const facilityObjId = new Types.ObjectId(params.facilityId.toString());

    const sealDoc = await DailySealLedger.findOne({
      tenantId: tenantObjId,
      facilityId: facilityObjId,
      sealDate: params.sealDate,
    });

    if (!sealDoc) {
      throw new Error(`Seal record not found for facility ${params.facilityId} on date ${params.sealDate}`);
    }

    const newLeafHash = hashCanonicalRecord(params.newPayload);

    sealDoc.isAmended = true;
    sealDoc.amendmentCount += 1;
    sealDoc.status = 'AMENDED_AFTER_SEAL';

    if (!sealDoc.amendmentHistory) {
      sealDoc.amendmentHistory = [];
    }

    sealDoc.amendmentHistory.push({
      amendedAt: new Date(),
      amendedBy: new Types.ObjectId(params.amendedBy.toString()),
      reason: params.reason,
      overrideRecordId: new Types.ObjectId(params.overrideRecordId.toString()),
      previousLeafHash: params.previousLeafHash,
      newLeafHash,
    });

    // Append new leaf as MANAGER_OVERRIDE
    sealDoc.leaves.push({
      recordType: 'MANAGER_OVERRIDE',
      recordId: new Types.ObjectId(params.overrideRecordId.toString()),
      canonicalHash: newLeafHash,
      timestamp: new Date(),
      metadata: { reason: params.reason, originalHash: params.previousLeafHash },
    });

    sealDoc.leafCount = sealDoc.leaves.length;

    // Recompute root incorporating the appended override leaf
    const updatedLeafHashes = sealDoc.leaves.map((l) => l.canonicalHash);
    const updatedTree = buildMerkleTree(updatedLeafHashes);
    sealDoc.merkleRoot = updatedTree.root;

    await sealDoc.save();
    return sealDoc;
  }
}

export const merkleSealService = new MerkleSealService();
