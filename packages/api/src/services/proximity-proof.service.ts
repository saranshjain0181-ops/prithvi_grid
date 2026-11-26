import crypto from 'crypto';
import { Types } from 'mongoose';
import { ProximityProof, IProximityProof } from '../db/models/ProximityProof';
import { PhysicalAsset } from '../db/models/PhysicalAsset';
import { LabourExecutionLedger } from '../db/models/LabourExecutionLedger';

export interface VerifyProximityPayload {
  workerId: string | Types.ObjectId;
  nodeId: string | Types.ObjectId;
  pitId: string | Types.ObjectId;
  facilityId: string | Types.ObjectId;
  nonce: string;
  workerHash: string;
  nodeTimestamp: string | Date;
  readingsSnapshot: {
    tempC: number;
    moisturePct: number;
    ph: number;
    methanePpm: number;
    supercapMv: number;
  };
  signature: string;
  syncedFromOffline?: boolean;
}

/**
 * Computes canonical signature string for Bluetooth proximity proof.
 */
export function computeProximitySignature(
  deviceSecret: string,
  nodeId: string,
  nonce: string,
  workerHash: string,
  timestampIso: string
): string {
  const message = `${nodeId}:${nonce}:${workerHash}:${timestampIso}`;
  return crypto.createHmac('sha256', deviceSecret).update(message).digest('hex');
}

export class ProximityProofService {
  /**
   * Generates a secure, cryptographically random challenge nonce for worker phone.
   */
  public generateChallengeNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Validates a BLE proximity proof against node secret key and anti-replay cache.
   */
  public async verifyAndStoreProximityProof(payload: VerifyProximityPayload): Promise<IProximityProof> {
    const workerObjId = new Types.ObjectId(payload.workerId.toString());
    const nodeObjId = new Types.ObjectId(payload.nodeId.toString());
    const pitObjId = new Types.ObjectId(payload.pitId.toString());
    const facilityObjId = new Types.ObjectId(payload.facilityId.toString());

    // 1. Anti-Replay Check: Ensure nonce has not been previously used
    const existingNonce = await ProximityProof.findOne({ nonce: payload.nonce });
    if (existingNonce) {
      throw new Error(`Replay attack detected: Challenge nonce ${payload.nonce} already consumed.`);
    }

    // 2. Fetch node asset to retrieve device secret
    const nodeAsset = await PhysicalAsset.findById(nodeObjId);
    const deviceSecret = nodeAsset?.deviceKey || 'prithvi-spear-secret-2026';

    // 3. Compute expected signature
    const tsIso = typeof payload.nodeTimestamp === 'string'
      ? payload.nodeTimestamp
      : payload.nodeTimestamp.toISOString();

    const expectedSig = computeProximitySignature(
      deviceSecret,
      payload.nodeId.toString(),
      payload.nonce,
      payload.workerHash,
      tsIso
    );

    let status: IProximityProof['verificationStatus'] = 'VALID';
    if (expectedSig !== payload.signature) {
      status = 'INVALID_SIGNATURE';
    }

    // 4. Persist Proximity Proof
    const proofDoc = await ProximityProof.create({
      workerId: workerObjId,
      nodeId: nodeObjId,
      pitId: pitObjId,
      facilityId: facilityObjId,
      nonce: payload.nonce,
      workerHash: payload.workerHash,
      nodeTimestamp: new Date(payload.nodeTimestamp),
      readingsSnapshot: payload.readingsSnapshot,
      signature: payload.signature,
      verificationStatus: status,
      syncedFromOffline: Boolean(payload.syncedFromOffline),
      receivedAt: new Date(),
    });

    return proofDoc;
  }
}

export const proximityProofService = new ProximityProofService();
