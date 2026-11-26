/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 5
 * Print and Signage Studio
 * Unified printed artifact generator: QR plates, bag labels, safety posters, and SOP cards.
 * [LEGAL-REVIEW] Regulated label claims boundary and durable outdoor specification.
 */

export type TemplateCategory =
  | 'PIT_PLATE'
  | 'CONTAINER_LABEL'
  | 'BAG_LABEL'
  | 'SAFETY_POSTER'
  | 'EVACUATION_MAP'
  | 'SEGREGATION_GUIDE'
  | 'SOP_POSTER';

export interface PrintTemplate {
  templateId: string;
  category: TemplateCategory;
  name: string;
  version: number;
  languages: ('hi' | 'en')[];
  dimensionsMm: { width: number; height: number };
  requiredFields: string[];
  qrDeepLinkPattern: string;
  isRegulated: boolean;
  legalReviewPassed: boolean;
}

export interface PrintJob {
  jobId: string;
  templateId: string;
  templateVersion: number;
  requestedByUserId: string;
  itemsCount: number;
  renderedPdfHash: string;
  createdAt: string;
  status: 'PENDING' | 'GENERATED' | 'FAILED';
}

export interface SignInstance {
  signId: string;
  templateId: string;
  templateVersion: number;
  entityId: string;
  locationCoords: { x: number; y: number; zone: string };
  placedAt: string;
  isOutdated: boolean;
  outdatedReason?: string;
  lastReprintJobId?: string;
}

export interface ScanTestResult {
  scanTestId: string;
  templateId: string;
  testedQrString: string;
  isDecodable: boolean;
  resolvedEntityId?: string;
  testedAt: string;
}
