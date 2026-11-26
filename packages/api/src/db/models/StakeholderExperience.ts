/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 23
 * Stakeholder Experience Cockpit
 * Comprehensive community sentiment: fence-line odor, complaint SLAs, pulse surveys, and Experience Index.
 */

export interface StakeholderGroupSentiment {
  groupName: 'HOSPITAL_PATIENTS_STAFF' | 'HOTEL_GUESTS' | 'TOWNSHIP_RESIDENTS' | 'FENCELINE_NEIGHBOURS';
  experienceIndex: number; // 0 - 100
  openComplaints: number;
  averageResponseTimeHours: number;
  pulseSatisfactionPct: number;
  topAffectingIssue: string;
}

export interface StakeholderExperienceView {
  tenantId: string;
  facilityId: string;
  asOfDate: string;
  overallExperienceIndex: number; // 0 - 100
  groups: StakeholderGroupSentiment[];
  totalNoticesBroadcasted: number;
  compostDistributedToCommunityKg: number;
  greenBadgeStatus: 'CERTIFIED' | 'UNDER_REVIEW' | 'RENEWAL_DUE';
}
