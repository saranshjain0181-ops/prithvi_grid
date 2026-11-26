/**
 * Prithvi-Grid Innovation Playbook Volume 5 — Feature 17
 * Operating Rhythm, Review Meetings and Action Tracker
 * Cadence calendars, bound dashboard widget snapshots, decisions, and action escalation.
 */

export type CadenceType = 'DAILY_HUDDLE' | 'WEEKLY_OPS_REVIEW' | 'MONTHLY_BUSINESS_REVIEW' | 'QUARTERLY_QBR';

export interface MeetingAgendaItem {
  itemId: string;
  title: string;
  boundWidgetId: string;
  snapshotDataRef: string;
}

export interface ReviewActionItem {
  actionId: string;
  meetingId: string;
  title: string;
  assignedToUserId: string;
  dueDate: string;
  isOverdue: boolean;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'ESCALATED';
}

export interface ReviewMeeting {
  meetingId: string;
  facilityId: string;
  cadence: CadenceType;
  title: string;
  heldAt: string;
  agendaItems: MeetingAgendaItem[];
  decisionsTaken: string[];
  actionsCreated: ReviewActionItem[];
  minutesSealedHash: string;
}
