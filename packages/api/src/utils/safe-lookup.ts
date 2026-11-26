import mongoose, { Types } from 'mongoose';
import { PhysicalAsset } from '../db/models/PhysicalAsset';
import { FacilityLocation } from '../db/models/FacilityLocation';

export function toValidObjectId(id: unknown): Types.ObjectId | null {
  if (!id) return null;
  const str = String(id).trim();
  return mongoose.Types.ObjectId.isValid(str) ? new mongoose.Types.ObjectId(str) : null;
}

export async function resolveBoxAsset(
  boxIdOrCode?: string,
  facilityId?: string,
  entityId?: string | Types.ObjectId
) {
  const entityFilter: any = {};
  if (entityId) {
    entityFilter.entityId = Types.ObjectId.isValid(entityId) ? new Types.ObjectId(entityId) : entityId;
  }

  if (boxIdOrCode) {
    if (mongoose.Types.ObjectId.isValid(boxIdOrCode)) {
      const box = await PhysicalAsset.findOne({
        _id: new Types.ObjectId(boxIdOrCode),
        type: 'COMPOST_BOX',
        ...entityFilter,
      });
      if (box) return box;
    }

    const boxByCode = await PhysicalAsset.findOne({
      $or: [{ assetCode: boxIdOrCode }, { name: boxIdOrCode }, { serialNumber: boxIdOrCode }],
      type: 'COMPOST_BOX',
      ...entityFilter,
    });
    if (boxByCode) return boxByCode;

    // If an explicit identifier was queried but not found, DO NOT return an arbitrary box
    return null;
  }

  // Fallback for empty parameters: find within facility or entity
  const facOid = toValidObjectId(facilityId);
  if (facOid) {
    const box = await PhysicalAsset.findOne({ facilityId: facOid, type: 'COMPOST_BOX', ...entityFilter });
    if (box) return box;
  }

  if (entityId) {
    return PhysicalAsset.findOne({ type: 'COMPOST_BOX', ...entityFilter });
  }

  return PhysicalAsset.findOne({ type: 'COMPOST_BOX' });
}

export async function resolveNodeAsset(
  nodeIdOrCode?: string,
  entityId?: string | Types.ObjectId
) {
  const entityFilter: any = {};
  if (entityId) {
    entityFilter.entityId = Types.ObjectId.isValid(entityId) ? new Types.ObjectId(entityId) : entityId;
  }

  if (nodeIdOrCode) {
    if (mongoose.Types.ObjectId.isValid(nodeIdOrCode)) {
      const node = await PhysicalAsset.findOne({
        _id: new Types.ObjectId(nodeIdOrCode),
        type: 'IOT_NODE',
        ...entityFilter,
      });
      if (node) return node;
    }

    const nodeByCode = await PhysicalAsset.findOne({
      $or: [
        { assetCode: nodeIdOrCode },
        { name: nodeIdOrCode },
        { macAddress: nodeIdOrCode },
        { serialNumber: nodeIdOrCode },
      ],
      type: 'IOT_NODE',
      ...entityFilter,
    });
    if (nodeByCode) return nodeByCode;

    // If an explicit identifier was queried but not found, DO NOT return an arbitrary node
    return null;
  }

  if (entityId) {
    return PhysicalAsset.findOne({ type: 'IOT_NODE', ...entityFilter });
  }

  return PhysicalAsset.findOne({ type: 'IOT_NODE' });
}

export async function resolveFacility(
  facilityIdOrCode?: string,
  entityId?: string | Types.ObjectId
) {
  const entityFilter: any = {};
  if (entityId) {
    entityFilter.entityId = Types.ObjectId.isValid(entityId) ? new Types.ObjectId(entityId) : entityId;
  }

  if (facilityIdOrCode) {
    if (mongoose.Types.ObjectId.isValid(facilityIdOrCode)) {
      const fac = await FacilityLocation.findOne({
        _id: new Types.ObjectId(facilityIdOrCode),
        ...entityFilter,
      });
      if (fac) return fac;
    }

    const facByCode = await FacilityLocation.findOne({
      $or: [{ code: facilityIdOrCode }, { name: facilityIdOrCode }, { facilityName: facilityIdOrCode }],
      ...entityFilter,
    });
    if (facByCode) return facByCode;

    return null;
  }

  if (entityId) {
    return FacilityLocation.findOne({ ...entityFilter });
  }

  return FacilityLocation.findOne();
}
