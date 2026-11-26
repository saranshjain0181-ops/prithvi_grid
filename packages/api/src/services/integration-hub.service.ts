import { createHmac } from 'crypto';
import {
  Connector,
  MappingSpec,
  SyncRun,
  StagingRecord,
  OutboundSubscription,
} from '../db/models/IntegrationHub';

export class IntegrationHubService {
  private connectors: Map<string, Connector> = new Map();
  private mappings: Map<string, MappingSpec> = new Map();
  private runs: Map<string, SyncRun> = new Map();
  private stagingRecords: Map<string, StagingRecord[]> = new Map();
  private outboundSubs: Map<string, OutboundSubscription> = new Map();

  public registerConnector(connector: Connector): void {
    this.connectors.set(connector.connectorId, connector);
  }

  public saveMapping(mapping: MappingSpec): void {
    this.mappings.set(mapping.mappingId, mapping);
  }

  public registerOutboundSubscription(sub: OutboundSubscription): void {
    this.outboundSubs.set(sub.subscriptionId, sub);
  }

  public executeStagedImport(params: {
    connectorId: string;
    mappingId: string;
    rawRows: Record<string, any>[];
  }): { run: SyncRun; staged: StagingRecord[]; validCount: number; errorCount: number } {
    const connector = this.connectors.get(params.connectorId);
    if (!connector) throw new Error(`Connector ${params.connectorId} not found`);

    const mapping = this.mappings.get(params.mappingId);
    if (!mapping) throw new Error(`Mapping ${params.mappingId} not found`);

    const runId = `RUN-${Date.now()}`;
    const staged: StagingRecord[] = [];
    let validCount = 0;
    let errorCount = 0;

    for (let i = 0; i < params.rawRows.length; i++) {
      const row = params.rawRows[i];
      const errors: string[] = [];
      const transformed: Record<string, any> = {};

      const externalKey = row['id'] || row['bookingId'] || row['ref'] || `ROW-${i + 1}`;

      // Field mapping & transformations
      for (const [sourceField, targetField] of Object.entries(mapping.fieldMap)) {
        const val = row[sourceField];
        if (val === undefined || val === null || val === '') {
          errors.push(`Missing mandatory field: ${sourceField} -> ${targetField}`);
        } else {
          // Apply transforms
          const transform = mapping.transforms[targetField];
          if (transform === 'KG_TO_TONNES') {
            transformed[targetField] = Number(val) / 1000;
          } else if (transform === 'PARSE_DATE') {
            const parsed = new Date(val);
            if (isNaN(parsed.getTime())) {
              errors.push(`Invalid date format for ${sourceField}: ${val}`);
            } else {
              transformed[targetField] = parsed.toISOString();
            }
          } else {
            transformed[targetField] = val;
          }
        }
      }

      const isValid = errors.length === 0;
      if (isValid) {
        validCount++;
      } else {
        errorCount++;
      }

      staged.push({
        stagingId: `STG-${runId}-${i + 1}`,
        runId,
        externalKey: String(externalKey),
        rawPayload: row,
        transformedPayload: isValid ? transformed : undefined,
        validationErrors: errors,
        status: isValid ? 'VALID' : 'ERROR',
      });
    }

    const run: SyncRun = {
      runId,
      connectorId: params.connectorId,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      rowsProcessed: params.rawRows.length,
      rowsStaged: staged.length,
      errorsCount: errorCount,
      status: errorCount === 0 ? 'SUCCESS' : validCount > 0 ? 'PARTIAL' : 'FAILED',
      freshnessLagHours: 0.1,
    };

    this.runs.set(runId, run);
    this.stagingRecords.set(runId, staged);

    return { run, staged, validCount, errorCount };
  }

  public applyStagedRun(runId: string): { appliedCount: number; rejectedCount: number } {
    const staged = this.stagingRecords.get(runId) || [];
    let appliedCount = 0;
    let rejectedCount = 0;

    for (const record of staged) {
      if (record.status === 'VALID') {
        record.status = 'APPLIED';
        record.appliedAt = new Date().toISOString();
        appliedCount++;
      } else {
        record.status = 'REJECTED';
        rejectedCount++;
      }
    }

    return { appliedCount, rejectedCount };
  }

  public generateOutboundWebhook(subscriptionId: string, eventName: string, payload: Record<string, any>) {
    const sub = this.outboundSubs.get(subscriptionId);
    if (!sub || !sub.isActive) throw new Error(`Active outbound subscription ${subscriptionId} not found`);

    const jsonString = JSON.stringify(payload);
    const signature = createHmac('sha256', sub.secretSignatureKey).update(jsonString).digest('hex');

    return {
      endpoint: sub.targetWebhookUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-Prithvi-Signature': signature,
        'X-Prithvi-Event': eventName,
      },
      body: jsonString,
    };
  }

  public getConnectorHealth(connectorId: string) {
    const connector = this.connectors.get(connectorId);
    const allRuns = Array.from(this.runs.values()).filter((r) => r.connectorId === connectorId);
    const lastRun = allRuns[allRuns.length - 1];

    return {
      connector,
      totalRuns: allRuns.length,
      lastSyncStatus: lastRun?.status || 'IDLE',
      lastSyncAt: lastRun?.completedAt,
      freshnessHours: lastRun?.freshnessLagHours || 0,
      totalErrorsLogged: allRuns.reduce((acc, r) => acc + r.errorsCount, 0),
    };
  }
}
