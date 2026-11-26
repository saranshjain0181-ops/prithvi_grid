import { ConfigScope, ConfigTimeMachine, IConfigVersion } from '../db/models/ConfigTimeMachine.js';
import crypto from 'crypto';

export interface ConfigDiffEntry {
  path: string;
  previousValue: any;
  currentValue: any;
  changeType: 'ADDED' | 'MODIFIED' | 'REMOVED';
}

export class ConfigStoreService {
  /**
   * Computes a canonical JSON representation with sorted keys
   */
  canonicalJson(obj: any): string {
    return JSON.stringify(obj, Object.keys(obj).sort());
  }

  /**
   * Generates a cryptographic SHA-256 signature for a configuration version
   */
  computeSignature(params: {
    configKey: string;
    scope: ConfigScope;
    scopeId: string;
    version: number;
    configJson: string;
    modifiedBy: string;
  }): string {
    const payload = `${params.configKey}:${params.scope}:${params.scopeId}:${params.version}:${params.configJson}:${params.modifiedBy}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Computes human-readable key-value diffs between two JSON configuration payloads
   */
  computeDiff(prevJson: string, currJson: string): ConfigDiffEntry[] {
    const prev = JSON.parse(prevJson);
    const curr = JSON.parse(currJson);
    const diffs: ConfigDiffEntry[] = [];

    const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);

    for (const key of allKeys) {
      if (!(key in prev)) {
        diffs.push({ path: key, previousValue: undefined, currentValue: curr[key], changeType: 'ADDED' });
      } else if (!(key in curr)) {
        diffs.push({ path: key, previousValue: prev[key], currentValue: undefined, changeType: 'REMOVED' });
      } else if (JSON.stringify(prev[key]) !== JSON.stringify(curr[key])) {
        diffs.push({ path: key, previousValue: prev[key], currentValue: curr[key], changeType: 'MODIFIED' });
      }
    }

    return diffs;
  }

  /**
   * Saves a new version of a configuration
   */
  async saveConfig(params: {
    configKey: string;
    scope: ConfigScope;
    scopeId: string;
    configObj: any;
    changeSummary: string;
    modifiedBy: string;
  }): Promise<IConfigVersion> {
    const latest = await ConfigTimeMachine.findOne({
      configKey: params.configKey,
      scope: params.scope,
      scopeId: params.scopeId,
    }).sort({ version: -1 });

    const version = latest ? latest.version + 1 : 1;
    const configJson = this.canonicalJson(params.configObj);

    if (latest && latest.status === 'ACTIVE') {
      latest.status = 'ARCHIVED';
      await latest.save();
    }

    const auditSignature = this.computeSignature({
      configKey: params.configKey,
      scope: params.scope,
      scopeId: params.scopeId,
      version,
      configJson,
      modifiedBy: params.modifiedBy,
    });

    const newVersion = await ConfigTimeMachine.create({
      configKey: params.configKey,
      scope: params.scope,
      scopeId: params.scopeId,
      version,
      configJson,
      changeSummary: params.changeSummary,
      modifiedBy: params.modifiedBy,
      status: 'ACTIVE',
      auditSignature,
    });

    return newVersion;
  }

  /**
   * Safe rollback: restores a previous version by creating a new active version with that payload
   */
  async rollbackToVersion(params: {
    configKey: string;
    scope: ConfigScope;
    scopeId: string;
    targetVersion: number;
    modifiedBy: string;
  }): Promise<IConfigVersion> {
    const target = await ConfigTimeMachine.findOne({
      configKey: params.configKey,
      scope: params.scope,
      scopeId: params.scopeId,
      version: params.targetVersion,
    });

    if (!target) {
      throw new Error(`Target configuration version ${params.targetVersion} not found.`);
    }

    return this.saveConfig({
      configKey: params.configKey,
      scope: params.scope,
      scopeId: params.scopeId,
      configObj: JSON.parse(target.configJson),
      changeSummary: `Rollback to version ${params.targetVersion} (restoring config from ${target.effectiveFrom})`,
      modifiedBy: params.modifiedBy,
    });
  }
}

export const configStoreService = new ConfigStoreService();
