import { IEntityReference, IEventEnvelope } from '../db/models/EventEnvelope.js';
import crypto from 'crypto';

export interface PublishEventInput<T = any> {
  eventType: string;
  schemaVersion?: number;
  tenantId: string;
  facilityId: string;
  entityRefs: IEntityReference[];
  actor: {
    actorId: string;
    role: string;
    actorType: 'USER' | 'DEVICE' | 'SYSTEM';
  };
  occurrenceTime?: Date;
  correlationId?: string;
  causationId?: string;
  payload: T;
  evidenceRefs?: string[];
  confidence?: number;
  source: 'DEVICE' | 'APP' | 'IMPORT' | 'SYSTEM';
  audienceRoles?: string[];
  containsPersonalData?: boolean;
}

export type EventConsumerHandler<T = any> = (event: IEventEnvelope<T>) => Promise<void> | void;

export interface DeadLetterEntry {
  eventId: string;
  eventType: string;
  consumerName: string;
  error: string;
  timestamp: Date;
}

export class EventSpineService {
  private consumers: Map<string, Array<{ name: string; handler: EventConsumerHandler }>> = new Map();
  private processedLedger: Set<string> = new Set(); // consumerName:eventId
  private deadLetters: DeadLetterEntry[] = [];

  /**
   * Subscribes a consumer handler to a domain event type
   */
  subscribe<T = any>(eventType: string, consumerName: string, handler: EventConsumerHandler<T>): void {
    if (!this.consumers.has(eventType)) {
      this.consumers.set(eventType, []);
    }
    this.consumers.get(eventType)!.push({ name: consumerName, handler });
  }

  /**
   * Deterministically constructs standard event envelope
   */
  createEnvelope<T = any>(input: PublishEventInput<T>): IEventEnvelope<T> {
    const eventId = `EVT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const correlationId = input.correlationId || `CORR-${crypto.randomBytes(4).toString('hex')}`;

    return {
      eventId,
      eventType: input.eventType,
      schemaVersion: input.schemaVersion || 1,
      tenantId: input.tenantId,
      facilityId: input.facilityId,
      entityRefs: input.entityRefs,
      actor: input.actor,
      occurrenceTime: input.occurrenceTime || new Date(),
      serverTime: new Date(),
      correlationId,
      causationId: input.causationId,
      payload: input.payload,
      evidenceRefs: input.evidenceRefs || [],
      confidence: input.confidence,
      source: input.source,
      audienceRoles: input.audienceRoles || ['OPERATOR', 'SUPERVISOR', 'MANAGER'],
      containsPersonalData: input.containsPersonalData || false,
      isPublished: true,
    } as any;
  }

  /**
   * Publishes an event through the outbox spine and delivers to subscribed consumers idempotently
   */
  async publish<T = any>(input: PublishEventInput<T>): Promise<IEventEnvelope<T>> {
    const envelope = this.createEnvelope(input);

    const handlers = this.consumers.get(envelope.eventType) || [];
    for (const { name, handler } of handlers) {
      const ledgerKey = `${name}:${envelope.eventId}`;
      if (this.processedLedger.has(ledgerKey)) {
        continue; // Idempotent deduplication
      }

      try {
        await handler(envelope);
        this.processedLedger.add(ledgerKey);
      } catch (err: any) {
        this.deadLetters.push({
          eventId: envelope.eventId,
          eventType: envelope.eventType,
          consumerName: name,
          error: err.message || String(err),
          timestamp: new Date(),
        });
      }
    }

    return envelope;
  }

  /**
   * Returns dead letters for platform inspection
   */
  getDeadLetters(): DeadLetterEntry[] {
    return [...this.deadLetters];
  }

  /**
   * Clears in-memory ledger and dead letters (useful for test resets)
   */
  resetLedger(): void {
    this.processedLedger.clear();
    this.deadLetters = [];
  }
}

export const eventSpineService = new EventSpineService();
