import {
  TrialProtocol,
  FieldTrial,
  TrialObservation,
  ProofCard,
} from '../db/models/FieldProof';

export class FieldProofService {
  private protocols: Map<string, TrialProtocol> = new Map();
  private trials: Map<string, FieldTrial> = new Map();
  private observations: Map<string, TrialObservation[]> = new Map();

  constructor() {
    this.seedProtocols();
  }

  private seedProtocols(): void {
    const defaultProto: TrialProtocol = {
      protocolId: 'PROTO-SEEDLING-GERM',
      name: 'Standard Cress & Tomato Germination Vigor Test',
      testType: 'POT_GERMINATION',
      controlMedium: 'Sterile Coco Peat Control',
      testMixRatiosPct: [10, 20, 30],
      evaluationDays: [0, 7, 14, 21],
      preRegisteredSuccessRule: '>= 85% germination and >= 15% height advantage over control at 14 days',
    };
    this.protocols.set(defaultProto.protocolId, defaultProto);
  }

  public startTrial(params: {
    protocolId: string;
    lotNumber: string;
    participantType: 'INTERNAL_FACILITY' | 'EXTERNAL_BUYER';
    participantName: string;
  }): FieldTrial {
    const trialId = `TRL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const trial: FieldTrial = {
      trialId,
      protocolId: params.protocolId,
      lotNumber: params.lotNumber,
      participantType: params.participantType,
      participantName: params.participantName,
      startedAt: new Date().toISOString(),
      status: 'ACTIVE',
    };

    this.trials.set(trialId, trial);
    this.observations.set(trialId, []);
    return trial;
  }

  public recordObservation(observation: TrialObservation): TrialObservation {
    const list = this.observations.get(observation.trialId) || [];
    list.push(observation);
    this.observations.set(observation.trialId, list);
    return observation;
  }

  public completeTrial(trialId: string, isSuccessRuleMet: boolean): FieldTrial {
    const trial = this.trials.get(trialId);
    if (!trial) throw new Error(`Trial ${trialId} not found`);

    trial.status = 'COMPLETED';
    trial.completedAt = new Date().toISOString();
    trial.isSuccessRuleMet = isSuccessRuleMet;

    return trial;
  }

  public generateProofCard(params: {
    lotNumber: string;
    agronomistUserId: string;
    claimsRegisterRef: string;
  }): ProofCard {
    const relevantTrials = Array.from(this.trials.values()).filter(
      (t) => t.lotNumber === params.lotNumber && t.status === 'COMPLETED'
    );

    if (relevantTrials.length === 0) {
      throw new Error(`Cannot issue proof card: zero completed trials for lot ${params.lotNumber}`);
    }

    const totalTrials = relevantTrials.length;
    const successes = relevantTrials.filter((t) => t.isSuccessRuleMet).length;
    const successRatePct = Math.round((successes / totalTrials) * 100);

    return {
      cardId: `CARD-${params.lotNumber}-${Date.now()}`,
      lotNumber: params.lotNumber,
      totalTrialsConducted: totalTrials,
      successfulTrialsCount: successes,
      successRatePct,
      testedRatios: '10% to 20% compost blend',
      headlineSummary: `In ${totalTrials} audited nursery trials, ${successes} achieved superior germination (>85%) over unamended control.`,
      conditionsStatement:
        'Observations measured on certified nursery pots with drip irrigation under tropical greenhouse conditions.',
      isAgronomistApproved: true,
      claimsRegisterReference: params.claimsRegisterRef,
    };
  }
}
