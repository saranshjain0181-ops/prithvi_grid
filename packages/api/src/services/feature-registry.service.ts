import { IFeatureManifest } from '../db/models/FeatureRegistry.js';

export interface AttentionBudgetEvaluation {
  role: 'SAFAI_MITRA' | 'SUPERVISOR' | 'FACILITY_MANAGER';
  totalPromptsPerShift: number;
  totalExtraTaps: number;
  totalPushPerDay: number;
  maxPromptsAllowed: number;
  maxTapsAllowed: number;
  isCompliant: boolean;
  warnings: string[];
}

export class FeatureRegistryService {
  private manifests: Map<string, IFeatureManifest> = new Map();

  /**
   * Registers a feature manifest into the registry
   */
  registerManifest(manifest: Partial<IFeatureManifest>): IFeatureManifest {
    const doc: any = {
      featureId: manifest.featureId,
      version: manifest.version || '1.0.0',
      name: manifest.name,
      volume: manifest.volume || 3,
      dependencies: manifest.dependencies || [],
      eventsPublished: manifest.eventsPublished || [],
      eventsConsumed: manifest.eventsConsumed || [],
      widgetsContributed: manifest.widgetsContributed || [],
      attentionCost: {
        promptsPerShift: manifest.attentionCost?.promptsPerShift || 0,
        extraTapsPerTask: manifest.attentionCost?.extraTapsPerTask || 0,
        pushNotificationsPerDay: manifest.attentionCost?.pushNotificationsPerDay || 0,
      },
      expertReviewTags: manifest.expertReviewTags || [],
      isEnabledByDefault: manifest.isEnabledByDefault ?? true,
    };

    this.manifests.set(doc.featureId, doc);
    return doc;
  }

  /**
   * Evaluates compatibility matrix and verifies all dependencies are satisfied
   */
  validateCompatibility(enabledFeatureIds: string[]): {
    isCompatible: boolean;
    missingDependencies: Array<{ featureId: string; missing: string }>;
  } {
    const enabledSet = new Set(enabledFeatureIds);
    const missingDependencies: Array<{ featureId: string; missing: string }> = [];

    for (const fId of enabledFeatureIds) {
      const manifest = this.manifests.get(fId);
      if (!manifest) continue;

      for (const dep of manifest.dependencies) {
        if (!enabledSet.has(dep)) {
          missingDependencies.push({ featureId: fId, missing: dep });
        }
      }
    }

    return {
      isCompatible: missingDependencies.length === 0,
      missingDependencies,
    };
  }

  /**
   * Sums and checks attention costs against role attention budgets
   * Safai Mitra: max 8 prompts, max 25 taps
   * Supervisor: max 15 prompts, max 40 taps
   */
  evaluateAttentionBudget(enabledFeatureIds: string[], role: 'SAFAI_MITRA' | 'SUPERVISOR' | 'FACILITY_MANAGER'): AttentionBudgetEvaluation {
    let totalPrompts = 0;
    let totalTaps = 0;
    let totalPush = 0;

    for (const fId of enabledFeatureIds) {
      const manifest = this.manifests.get(fId);
      if (manifest?.attentionCost) {
        totalPrompts += manifest.attentionCost.promptsPerShift;
        totalTaps += manifest.attentionCost.extraTapsPerTask;
        totalPush += manifest.attentionCost.pushNotificationsPerDay;
      }
    }

    const limits = {
      SAFAI_MITRA: { maxPrompts: 8, maxTaps: 25 },
      SUPERVISOR: { maxPrompts: 15, maxTaps: 40 },
      FACILITY_MANAGER: { maxPrompts: 6, maxTaps: 50 },
    };

    const maxPromptsAllowed = limits[role].maxPrompts;
    const maxTapsAllowed = limits[role].maxTaps;
    const warnings: string[] = [];

    if (totalPrompts > maxPromptsAllowed) {
      warnings.push(`[BUDGET-EXCEEDED] Role ${role} prompts (${totalPrompts}) exceeds daily cap of ${maxPromptsAllowed}.`);
    }
    if (totalTaps > maxTapsAllowed) {
      warnings.push(`[BUDGET-EXCEEDED] Role ${role} extra taps (${totalTaps}) exceeds limit of ${maxTapsAllowed}.`);
    }

    return {
      role,
      totalPromptsPerShift: totalPrompts,
      totalExtraTaps: totalTaps,
      totalPushPerDay: totalPush,
      maxPromptsAllowed,
      maxTapsAllowed,
      isCompliant: warnings.length === 0,
      warnings,
    };
  }
}

export const featureRegistryService = new FeatureRegistryService();
