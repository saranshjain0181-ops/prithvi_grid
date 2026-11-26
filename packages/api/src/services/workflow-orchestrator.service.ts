import { IChainInstance, IChainStepDefinition, IChainStepRun } from '../db/models/ChainDefinition.js';
import crypto from 'crypto';

export interface ChainTemplate {
  chainKey: string;
  name: string;
  version: number;
  steps: IChainStepDefinition[];
}

export class WorkflowOrchestratorService {
  private templates: Map<string, ChainTemplate> = new Map();

  constructor() {
    this.registerStarterTemplates();
  }

  private registerStarterTemplates() {
    // 1. Loading Chain
    this.registerTemplate({
      chainKey: 'LOADING_CHAIN',
      name: 'Waste Receiving to First Heat Check Chain',
      version: 1,
      steps: [
        {
          stepKey: 'GATE_INSPECTION',
          name: 'Inspect waste at receiving bay',
          triggerEventType: 'container.collected',
          ownerRole: 'OPERATOR',
          expectedDurationMinutes: 10,
          slaTimeoutMinutes: 30,
        },
        {
          stepKey: 'PRE_PROCESSING',
          name: 'Shred and dewater coarse organics',
          triggerEventType: 'gate.inspection.completed',
          ownerRole: 'OPERATOR',
          requiredCertification: 'SHREDDER_OPERATOR',
          expectedDurationMinutes: 20,
          slaTimeoutMinutes: 60,
        },
        {
          stepKey: 'PARAT_LOADING',
          name: 'Mix bulking and load into pit with layer plan',
          triggerEventType: 'prep.session.completed',
          ownerRole: 'SAFAI_MITRA',
          expectedDurationMinutes: 30,
          slaTimeoutMinutes: 90,
        },
        {
          stepKey: 'FIRST_HEAT_CHECK',
          name: 'Verify thermophilic rise 24h post-loading',
          triggerEventType: 'pit.load.completed',
          ownerRole: 'SUPERVISOR',
          expectedDurationMinutes: 10,
          slaTimeoutMinutes: 1440, // 24 hours
          automatedAction: 'FORCE_NODE_READ',
        },
      ],
    });

    // 2. Acid Crash Rescue Chain
    this.registerTemplate({
      chainKey: 'ACID_CRASH_RESCUE',
      name: 'Anaerobic / Acid Crash S.O.S. Rescue Chain',
      version: 1,
      steps: [
        {
          stepKey: 'RECIPE_PROPOSAL',
          name: 'Sanjivani recipe calculated and dry bulking reserved',
          triggerEventType: 'pit.alert.raised',
          ownerRole: 'SYSTEM',
          expectedDurationMinutes: 5,
          slaTimeoutMinutes: 15,
          automatedAction: 'CREATE_TASK',
        },
        {
          stepKey: 'BUFFER_APPLICATION',
          name: 'Apply wood ash and turn pile to restore aeration',
          triggerEventType: 'task.assigned',
          ownerRole: 'SAFAI_MITRA',
          expectedDurationMinutes: 30,
          slaTimeoutMinutes: 120,
        },
        {
          stepKey: 'RECOVERY_VERIFICATION',
          name: 'Verify core pH and temperature recovery',
          triggerEventType: 'pit.turn.completed',
          ownerRole: 'SUPERVISOR',
          expectedDurationMinutes: 15,
          slaTimeoutMinutes: 360,
        },
      ],
    });
  }

  registerTemplate(template: ChainTemplate): void {
    this.templates.set(template.chainKey, template);
  }

  getTemplate(chainKey: string): ChainTemplate | undefined {
    return this.templates.get(chainKey);
  }

  /**
   * Starts a new chain instance based on a registered template
   */
  startChain(params: {
    chainKey: string;
    tenantId: string;
    facilityId: string;
    entityRefs: Array<{ entityType: string; entityId: string }>;
  }): IChainInstance {
    const template = this.templates.get(params.chainKey);
    if (!template) {
      throw new Error(`Chain template ${params.chainKey} not found.`);
    }

    const instanceId = `CHN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const stepRuns: IChainStepRun[] = template.steps.map((s, idx) => ({
      stepKey: s.stepKey,
      status: idx === 0 ? 'ACTIVE' : 'PENDING',
      startedAt: idx === 0 ? new Date() : undefined,
      isOverdue: false,
    }));

    return {
      instanceId,
      chainKey: params.chainKey,
      chainVersion: template.version,
      tenantId: params.tenantId,
      facilityId: params.facilityId,
      entityRefs: params.entityRefs,
      status: 'RUNNING',
      stepRuns,
      currentStepIndex: 0,
      totalCycleTimeMinutes: 0,
      startedAt: new Date(),
    } as any;
  }

  /**
   * Advances a chain step upon completion of an action or event
   */
  advanceStep(instance: IChainInstance, completedStepKey: string, notes?: string): IChainInstance {
    const currentStep = instance.stepRuns[instance.currentStepIndex];
    if (!currentStep || currentStep.stepKey !== completedStepKey) {
      // Step already completed or mismatch
      return instance;
    }

    currentStep.status = 'COMPLETED';
    currentStep.completedAt = new Date();
    if (notes) currentStep.notes = notes;

    if (currentStep.startedAt) {
      const durationMs = currentStep.completedAt.getTime() - currentStep.startedAt.getTime();
      currentStep.actualDurationMinutes = Math.round(durationMs / 60000);
      instance.totalCycleTimeMinutes += currentStep.actualDurationMinutes;
    }

    // Move to next step or complete chain
    instance.currentStepIndex++;
    if (instance.currentStepIndex >= instance.stepRuns.length) {
      instance.status = 'COMPLETED';
      instance.completedAt = new Date();
    } else {
      const nextStep = instance.stepRuns[instance.currentStepIndex];
      nextStep.status = 'ACTIVE';
      nextStep.startedAt = new Date();
    }

    return instance;
  }
}

export const workflowOrchestratorService = new WorkflowOrchestratorService();
