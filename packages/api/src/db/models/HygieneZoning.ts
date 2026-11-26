/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 10
 * Hygiene Zoning and Biosecurity Routine
 * Spatial zoning, tool colour tags, clean-zone entry routines, and cross-contamination interlocks.
 * [EXPERT-REVIEW] Infection control and post-lethality biosecurity.
 */

export type HygieneZoneType = 'RAW' | 'TRANSITION' | 'CLEAN';

export interface HygieneZone {
  zoneId: string;
  facilityId: string;
  name: string;
  type: HygieneZoneType;
  allowedToolColor: 'RED' | 'YELLOW' | 'GREEN';
  requiresBootDip: boolean;
  requiresHandwash: boolean;
}

export interface CrossZoneBreach {
  breachId: string;
  zoneId: string;
  toolId: string;
  toolColor: 'RED' | 'YELLOW' | 'GREEN';
  expectedColor: 'RED' | 'YELLOW' | 'GREEN';
  reportedByUserId: string;
  affectedLotId?: string;
  actionTaken: string;
  timestamp: string;
}

export interface HygieneCheck {
  checkId: string;
  zoneId: string;
  checkedByUserId: string;
  bootDipRefreshed: boolean;
  handwashSoapStocked: boolean;
  toolsCleanedAndStored: boolean;
  timestamp: string;
}

export interface ZoneIntegrityScore {
  zoneId: string;
  score: number; // 0 - 100
  breachesLast30Days: number;
  checksCompletedPct: number;
  isCleanZoneCompromised: boolean;
}
