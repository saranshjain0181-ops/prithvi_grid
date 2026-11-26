/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 11
 * Fenceline Odor Survey and Neighbour Liaison
 * Boundary olfactometry routines, receptor wind correlation, and proactive neighbour communication.
 * [EXPERT-REVIEW] Field olfactometry and [LEGAL-REVIEW] nuisance commitments.
 */

export type OdorCharacter = 'EARTHY' | 'SOUR' | 'AMMONIA' | 'SULPHUR' | 'ROTTEN' | 'NONE';

export interface OdorPoint {
  pointId: string;
  facilityId: string;
  name: string;
  locationCoords: { x: number; y: number };
  isSensitiveReceptor: boolean; // hospital ward, hotel guest wing, school
  receptorName?: string;
}

export interface OdorRating {
  ratingId: string;
  pointId: string;
  walkId: string;
  intensity: number; // 0 (None) to 5 (Overwhelming)
  character: OdorCharacter;
  windDirectionDegrees: number; // 0 - 360
  windSpeedKmph: number;
  recordedByUserId: string;
  timestamp: string;
}

export interface NeighbourContact {
  contactId: string;
  facilityId: string;
  name: string;
  organizationOrBlock: string;
  preferredChannel: 'WHATSAPP' | 'SMS' | 'EMAIL';
  contactInfo: string;
  consentGranted: boolean;
}

export interface NeighbourNotice {
  noticeId: string;
  facilityId: string;
  title: string;
  activityType: 'HIGH_VOLUME_TURNING' | 'COMPOST_SCREENING' | 'MAINTENANCE';
  scheduledDate: string;
  messageHindi: string; // [NEEDS-NATIVE-REVIEW]
  messageEnglish: string;
  sentAt: string;
  recipientsCount: number;
}

export interface NeighbourComplaint {
  complaintId: string;
  facilityId: string;
  contactId?: string;
  locationDescription: string;
  observedOdorCharacter: OdorCharacter;
  reportedAt: string;
  responseDueAt: string;
  status: 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'CLOSED';
  mitigationNotes?: string;
}
