import { createHash } from 'crypto';
import {
  ReviewMeeting,
  ReviewActionItem,
  MeetingAgendaItem,
  CadenceType,
} from '../db/models/OperatingRhythm';

export class OperatingRhythmService {
  private meetings: Map<string, ReviewMeeting> = new Map();
  private actions: Map<string, ReviewActionItem> = new Map();

  public conductMeeting(params: {
    facilityId: string;
    cadence: CadenceType;
    title: string;
    agendaItems: MeetingAgendaItem[];
    decisionsTaken: string[];
    newActions: { title: string; assignedToUserId: string; dueDate: string }[];
  }): ReviewMeeting {
    const meetingId = `MTG-${Date.now()}`;
    const actionList: ReviewActionItem[] = [];

    for (const a of params.newActions) {
      const actionId = `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const item: ReviewActionItem = {
        actionId,
        meetingId,
        title: a.title,
        assignedToUserId: a.assignedToUserId,
        dueDate: a.dueDate,
        isOverdue: false,
        status: 'OPEN',
      };
      this.actions.set(actionId, item);
      actionList.push(item);
    }

    const minutesSealedHash = createHash('sha256')
      .update(`${meetingId}:${params.title}:${JSON.stringify(params.decisionsTaken)}:${Date.now()}`)
      .digest('hex');

    const meeting: ReviewMeeting = {
      meetingId,
      facilityId: params.facilityId,
      cadence: params.cadence,
      title: params.title,
      heldAt: new Date().toISOString(),
      agendaItems: params.agendaItems,
      decisionsTaken: params.decisionsTaken,
      actionsCreated: actionList,
      minutesSealedHash,
    };

    this.meetings.set(meetingId, meeting);
    return meeting;
  }

  public getOverdueActions(currentTimeMs = Date.now()): ReviewActionItem[] {
    const overdue: ReviewActionItem[] = [];
    for (const action of this.actions.values()) {
      if (action.status !== 'COMPLETED' && new Date(action.dueDate).getTime() < currentTimeMs) {
        action.isOverdue = true;
        action.status = 'ESCALATED';
        overdue.push(action);
      }
    }
    return overdue;
  }

  public completeAction(actionId: string): ReviewActionItem {
    const action = this.actions.get(actionId);
    if (!action) throw new Error(`Action ${actionId} not found`);
    action.status = 'COMPLETED';
    action.isOverdue = false;
    return action;
  }
}
