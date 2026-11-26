import crypto from 'crypto';
import { Types } from 'mongoose';
import { CompostBatch, ICompostBatch, CompostBatchStage, ILabCertificate } from '../db/models/CompostBatch';

export const CO2E_OFFSET_FACTOR_KG_PER_KG_WASTE = 0.62; // Standard CPCB bio-methane landfill avoidance factor

export interface CreateBatchInput {
  entityId: string | Types.ObjectId;
  facilityId: string | Types.ObjectId;
  boxId: string | Types.ObjectId;
  initialWasteWeightKg: number;
  notes?: string;
}

export interface CertifyBatchInput {
  certificateNumber: string;
  nitrogenPct: number;
  phosphorusPct: number;
  potassiumPct: number;
  cnRatio: number;
  ph: number;
  moisturePct: number;
  heavyMetalsPassed: boolean;
  labTechnician: string;
}

export interface HarvestBatchInput {
  curedCompostWeightKg: number;
  ratePerKgInr?: number;
  buyerOrganization?: string;
  notes?: string;
}

/**
 * Creates a new organic compost batch with ESG carbon offset baseline
 */
export async function createCompostBatch(input: CreateBatchInput): Promise<ICompostBatch> {
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const batchCode = `PG-BATCH-2026-${randomSuffix}`;

  const wasteKg = input.initialWasteWeightKg;
  const co2eMt = Number(((wasteKg * CO2E_OFFSET_FACTOR_KG_PER_KG_WASTE) / 1000).toFixed(3));
  const methaneAvoidedKg = Number((wasteKg * 0.045).toFixed(2));

  const batch = new CompostBatch({
    batchCode,
    entityId: new Types.ObjectId(input.entityId),
    facilityId: new Types.ObjectId(input.facilityId),
    boxId: new Types.ObjectId(input.boxId),
    startedAt: new Date(),
    initialWasteWeightKg: wasteKg,
    stage: 'INPUT_ACCUMULATION',
    esgCarbonOffset: {
      methaneDiversionKg: methaneAvoidedKg,
      co2EquivalentMt: co2eMt,
      esgRegistryStandard: 'SWM_2026_CPCB_CENTRAL_INDIA',
    },
    commercialValuation: {
      ratePerKgInr: 5.0,
      totalValueInr: 0,
    },
    notes: input.notes,
  });

  await batch.save();
  return batch;
}

/**
 * Transitions compost batch through biological maturation stages
 */
export async function transitionBatchStage(
  batchId: string | Types.ObjectId,
  targetStage: CompostBatchStage
): Promise<ICompostBatch> {
  const batch = await CompostBatch.findById(batchId);
  if (!batch) {
    throw new Error('Compost batch not found');
  }

  batch.stage = targetStage;
  await batch.save();
  return batch;
}

/**
 * Attaches official laboratory quality certificate (NPK, C:N ratio)
 */
export async function certifyCompostBatch(
  batchId: string | Types.ObjectId,
  cert: CertifyBatchInput
): Promise<ICompostBatch> {
  const batch = await CompostBatch.findById(batchId);
  if (!batch) {
    throw new Error('Compost batch not found');
  }

  batch.labCertificate = {
    ...cert,
    certifiedAt: new Date(),
  };
  batch.stage = 'LAB_CERTIFIED';

  await batch.save();
  return batch;
}

/**
 * Records final harvested compost mass balance and commercial revenue valuation
 */
export async function harvestCompostBatch(
  batchId: string | Types.ObjectId,
  harvest: HarvestBatchInput
): Promise<ICompostBatch> {
  const batch = await CompostBatch.findById(batchId);
  if (!batch) {
    throw new Error('Compost batch not found');
  }

  const initialKg = batch.initialWasteWeightKg;
  const curedKg = harvest.curedCompostWeightKg;
  const rate = harvest.ratePerKgInr || batch.commercialValuation.ratePerKgInr || 5.0;

  const volumeReductionPct =
    initialKg > 0 ? Number((((initialKg - curedKg) / initialKg) * 100).toFixed(1)) : 0;
  const totalValueInr = Math.round(curedKg * rate);

  batch.curedCompostWeightKg = curedKg;
  batch.volumeReductionPct = volumeReductionPct;
  batch.harvestedAt = new Date();
  batch.stage = 'HARVESTED';
  batch.commercialValuation = {
    ratePerKgInr: rate,
    totalValueInr,
    buyerOrganization: harvest.buyerOrganization,
  };

  if (harvest.notes) {
    batch.notes = (batch.notes ? batch.notes + ' | ' : '') + harvest.notes;
  }

  await batch.save();
  return batch;
}

/**
 * Generates aggregated ESG Carbon Ledger Report for an entity
 */
export async function generateEsgLedger(entityId: string | Types.ObjectId) {
  const batches = await CompostBatch.find({
    entityId: new Types.ObjectId(entityId),
  }).lean();

  const totalWasteDivertedKg = batches.reduce((sum, b) => sum + (b.initialWasteWeightKg || 0), 0);
  const totalCompostHarvestedKg = batches.reduce((sum, b) => sum + (b.curedCompostWeightKg || 0), 0);
  const totalCo2eOffsetMt = batches.reduce(
    (sum, b) => sum + (b.esgCarbonOffset?.co2EquivalentMt || 0),
    0
  );
  const totalCommercialValueInr = batches.reduce(
    (sum, b) => sum + (b.commercialValuation?.totalValueInr || 0),
    0
  );

  return {
    entityId: entityId.toString(),
    generatedAt: new Date().toISOString(),
    totalBatchesProcessed: batches.length,
    totalWasteDivertedKg,
    totalCompostHarvestedKg,
    totalCo2eOffsetMt: Number(totalCo2eOffsetMt.toFixed(3)),
    totalCommercialValueInr,
    esgCertificationStandard: 'SWM_2026_CPCB_CENTRAL_INDIA',
    landfillMethaneMitigationFactor: `${CO2E_OFFSET_FACTOR_KG_PER_KG_WASTE} kg CO2e / kg waste`,
  };
}
