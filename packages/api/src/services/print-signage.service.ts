import { createHash } from 'crypto';
import {
  PrintTemplate,
  PrintJob,
  SignInstance,
  ScanTestResult,
} from '../db/models/PrintSignageStudio';

export class PrintSignageService {
  private templates: Map<string, PrintTemplate> = new Map();
  private jobs: Map<string, PrintJob> = new Map();
  private signs: Map<string, SignInstance> = new Map();

  constructor() {
    this.seedDefaultTemplates();
  }

  private seedDefaultTemplates(): void {
    const defaultTemplates: PrintTemplate[] = [
      {
        templateId: 'TPL-PIT-PLATE',
        category: 'PIT_PLATE',
        name: 'Pit Identifier & Phase QR Plate',
        version: 1,
        languages: ['hi', 'en'],
        dimensionsMm: { width: 150, height: 100 },
        requiredFields: ['pitId', 'pitName', 'capacityKg', 'deepLink'],
        qrDeepLinkPattern: 'https://app.prithvigrid.com/p/{pitId}',
        isRegulated: false,
        legalReviewPassed: true,
      },
      {
        templateId: 'TPL-BAG-LABEL',
        category: 'BAG_LABEL',
        name: 'FCO-Compliant Compost Bag Label',
        version: 1,
        languages: ['hi', 'en'],
        dimensionsMm: { width: 100, height: 150 },
        requiredFields: ['lotNumber', 'moisturePct', 'npkRatio', 'mfgDate', 'deepLink'],
        qrDeepLinkPattern: 'https://app.prithvigrid.com/passport/{lotNumber}',
        isRegulated: true,
        legalReviewPassed: true, // [LEGAL-REVIEW]
      },
      {
        templateId: 'TPL-SAFETY-POSTER',
        category: 'SAFETY_POSTER',
        name: 'Yard Evacuation & Emergency SOP Poster',
        version: 1,
        languages: ['hi', 'en'],
        dimensionsMm: { width: 297, height: 420 }, // A3
        requiredFields: ['emergencyPhone', 'assemblyPoint', 'hospitalContact'],
        qrDeepLinkPattern: 'https://app.prithvigrid.com/safety/emergency',
        isRegulated: false,
        legalReviewPassed: true,
      },
    ];

    defaultTemplates.forEach((t) => this.templates.set(t.templateId, t));
  }

  public registerTemplate(template: PrintTemplate): void {
    if (template.isRegulated && !template.legalReviewPassed) {
      throw new Error(
        `Regulated template ${template.templateId} requires legalReviewPassed: true before activation [LEGAL-REVIEW]`
      );
    }
    this.templates.set(template.templateId, template);
  }

  public createPrintJob(params: {
    templateId: string;
    requestedByUserId: string;
    items: Record<string, any>[];
  }): PrintJob {
    const template = this.templates.get(params.templateId);
    if (!template) throw new Error(`Print template ${params.templateId} not found`);

    // Verify required fields
    for (const item of params.items) {
      for (const field of template.requiredFields) {
        if (!item[field] && field !== 'deepLink') {
          throw new Error(`Print item missing required template field: ${field}`);
        }
      }
    }

    const jobId = `JOB-${Date.now()}`;
    const payloadHash = createHash('sha256')
      .update(JSON.stringify({ templateId: template.templateId, items: params.items }))
      .digest('hex');

    const job: PrintJob = {
      jobId,
      templateId: template.templateId,
      templateVersion: template.version,
      requestedByUserId: params.requestedByUserId,
      itemsCount: params.items.length,
      renderedPdfHash: payloadHash,
      createdAt: new Date().toISOString(),
      status: 'GENERATED',
    };

    this.jobs.set(jobId, job);
    return job;
  }

  public placeSign(params: {
    templateId: string;
    entityId: string;
    locationCoords: { x: number; y: number; zone: string };
  }): SignInstance {
    const template = this.templates.get(params.templateId);
    if (!template) throw new Error(`Template ${params.templateId} not found`);

    const signId = `SIGN-${params.entityId}-${Date.now()}`;
    const sign: SignInstance = {
      signId,
      templateId: template.templateId,
      templateVersion: template.version,
      entityId: params.entityId,
      locationCoords: params.locationCoords,
      placedAt: new Date().toISOString(),
      isOutdated: false,
    };

    this.signs.set(signId, sign);
    return sign;
  }

  public flagOutdatedSigns(entityId: string, reason: string): SignInstance[] {
    const updated: SignInstance[] = [];
    for (const sign of this.signs.values()) {
      if (sign.entityId === entityId && !sign.isOutdated) {
        sign.isOutdated = true;
        sign.outdatedReason = reason;
        updated.push(sign);
      }
    }
    return updated;
  }

  public validateQrScan(testedQrString: string): ScanTestResult {
    const scanId = `SCAN-${Date.now()}`;
    const isValidPrithviUrl = testedQrString.startsWith('https://app.prithvigrid.com/');
    let entityId: string | undefined;

    if (isValidPrithviUrl) {
      const parts = testedQrString.split('/');
      entityId = parts[parts.length - 1];
    }

    return {
      scanTestId: scanId,
      templateId: 'GENERIC_VALIDATION',
      testedQrString,
      isDecodable: isValidPrithviUrl,
      resolvedEntityId: entityId,
      testedAt: new Date().toISOString(),
    };
  }

  public getSignageHealth(entityId?: string) {
    const allSigns = Array.from(this.signs.values());
    const relevant = entityId ? allSigns.filter((s) => s.entityId === entityId) : allSigns;
    const outdated = relevant.filter((s) => s.isOutdated);

    return {
      totalPlacedSigns: relevant.length,
      activeCurrentSigns: relevant.length - outdated.length,
      outdatedSignsCount: outdated.length,
      outdatedSigns: outdated,
    };
  }
}
