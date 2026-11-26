import { IMassBalanceFlow, MassBalanceFlow } from '../db/models/MassBalanceFlow.js';
import crypto from 'crypto';

export interface MassBalanceInput {
  wetWasteIntakeKg: number;
  bulkingAddedKg: number;
  waterAddedKg: number;
  fineCompostProducedKg: number;
  oversizeRejectsRecycledKg: number;
  nonCompostableRejectsLandfilledKg: number;
  leachateDischargedKg?: number;
  evaporationLossKg?: number;
  carbonDioxideLossKg?: number;
}

export interface MassBalanceResult {
  totalMassInputKg: number;
  totalAccountedOutputKg: number;
  evaporationLossKg: number;
  carbonDioxideLossKg: number;
  massImbalanceKg: number;
  imbalancePercentage: number;
  status: 'RECONCILED' | 'VARIANCE_ALERT';
  explanation: string;
}

export class MassBalanceService {
  /**
   * Deterministically reconciles facility mass balance and verifies loss envelopes
   */
  reconcileMassFlow(input: MassBalanceInput): MassBalanceResult {
    const totalMassInputKg = input.wetWasteIntakeKg + input.bulkingAddedKg + (input.waterAddedKg || 0);

    // Evaporation estimate: ~40% of initial moisture in aerobic thermophilic composting
    const evaporationLossKg =
      input.evaporationLossKg ?? Math.round(input.wetWasteIntakeKg * 0.45);

    // Respiration CO2 loss: ~15% of total dry biodegradable organic solids
    const carbonDioxideLossKg =
      input.carbonDioxideLossKg ?? Math.round(input.wetWasteIntakeKg * 0.12);

    const leachateKg = input.leachateDischargedKg || 0;

    const totalAccountedOutputKg =
      input.fineCompostProducedKg +
      input.oversizeRejectsRecycledKg +
      input.nonCompostableRejectsLandfilledKg +
      leachateKg +
      evaporationLossKg +
      carbonDioxideLossKg;

    const massImbalanceKg = Math.round(Math.abs(totalMassInputKg - totalAccountedOutputKg));
    const imbalancePercentage =
      totalMassInputKg > 0 ? Math.round((massImbalanceKg / totalMassInputKg) * 1000) / 10 : 0;

    // Tolerance limit is 10% mass imbalance
    const isReconciled = imbalancePercentage <= 10.0;
    const status: 'RECONCILED' | 'VARIANCE_ALERT' = isReconciled ? 'RECONCILED' : 'VARIANCE_ALERT';

    let explanation = '';
    if (isReconciled) {
      explanation = `मास बैलेंस संतुलित है (${imbalancePercentage}% अंतर)। सभी इनपुट और आउटपुट ऑडिट मानकों के अनुरूप हैं। [NEEDS-NATIVE-REVIEW]`;
    } else {
      explanation = `[VARIANCE-ALERT] मास बैलेंस में ${imbalancePercentage}% (${massImbalanceKg} किग्रा) का असंतुलन है। अनधिकृत कचरा निपटान या तौल त्रुटि की जाँच करें। [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      totalMassInputKg,
      totalAccountedOutputKg,
      evaporationLossKg,
      carbonDioxideLossKg,
      massImbalanceKg,
      imbalancePercentage,
      status,
      explanation,
    };
  }

  /**
   * Records mass balance period in db
   */
  async recordMassBalance(params: {
    entityId: string;
    facilityId: string;
    periodStart: string;
    periodEnd: string;
    flowData: MassBalanceInput;
    notes?: string;
  }): Promise<{ record: IMassBalanceFlow; result: MassBalanceResult }> {
    const flowId = `MB-${params.facilityId}-${params.periodStart}`;
    const result = this.reconcileMassFlow(params.flowData);

    const record = await MassBalanceFlow.findOneAndUpdate(
      { flowId },
      {
        flowId,
        entityId: params.entityId,
        facilityId: params.facilityId,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        wetWasteIntakeKg: params.flowData.wetWasteIntakeKg,
        bulkingAddedKg: params.flowData.bulkingAddedKg,
        waterAddedKg: params.flowData.waterAddedKg || 0,
        totalMassInputKg: result.totalMassInputKg,
        fineCompostProducedKg: params.flowData.fineCompostProducedKg,
        oversizeRejectsRecycledKg: params.flowData.oversizeRejectsRecycledKg,
        nonCompostableRejectsLandfilledKg: params.flowData.nonCompostableRejectsLandfilledKg,
        leachateDischargedKg: params.flowData.leachateDischargedKg || 0,
        evaporationLossKg: result.evaporationLossKg,
        carbonDioxideLossKg: result.carbonDioxideLossKg,
        totalAccountedOutputKg: result.totalAccountedOutputKg,
        massImbalanceKg: result.massImbalanceKg,
        imbalancePercentage: result.imbalancePercentage,
        status: result.status,
        notes: params.notes || result.explanation,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return { record, result };
  }
}

export const massBalanceService = new MassBalanceService();
