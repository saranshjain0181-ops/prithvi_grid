import { Schema, model, Document, Types } from 'mongoose';

export type IncidentCategory = 'OVERHEATING_FIRE_RISK' | 'EXTENDED_NODE_BLACKOUT' | 'LEACHATE_CONTAMINATION' | 'STAFF_INJURY_HAZARD';

export interface IIncidentTimelineEvent {
  timestamp: Date;
  eventType: 'ALERT_TRIGGERED' | 'INCIDENT_DECLARED' | 'FIELD_RESPONDER_ARRIVED' | 'ACTION_EXECUTED' | 'INCIDENT_RESOLVED';
  description: string;
  source: 'SYSTEM_SENSOR' | 'HUMAN_INPUT';
  actorId?: Types.ObjectId;
}

export interface IIncidentRoomRecord extends Document {
  facilityId: Types.ObjectId;
  incidentNumber: string; // e.g. "INC-2026-IND-014"
  category: IncidentCategory;
  severity: 'SEV_1_CRITICAL' | 'SEV_2_MAJOR' | 'SEV_3_MODERATE';
  incidentLeadId: Types.ObjectId;
  fieldResponderId?: Types.ObjectId;
  pitIdsInvolved: Types.ObjectId[];
  checklistSteps: Array<{
    stepText: string;
    isCompleted: boolean;
    completedAt?: Date;
  }>;
  timeline: IIncidentTimelineEvent[];
  afterActionSummary?: {
    narrativeSummary: string;
    contributingFactors: string[];
    correctiveActionDecisionId?: Types.ObjectId;
    sealedReportHash: string; // From Wave 1 Merkle seal
  };
  status: 'ACTIVE_TRIAGE' | 'CONTAINMENT_IN_PROGRESS' | 'RESOLVED_CLOSED';
  declaredAt: Date;
  resolvedAt?: Date;
}

export const IncidentRoomRecordSchema = new Schema<IIncidentRoomRecord>({
  facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation', required: true, index: true },
  incidentNumber: { type: String, required: true, unique: true },
  category: {
    type: String,
    enum: ['OVERHEATING_FIRE_RISK', 'EXTENDED_NODE_BLACKOUT', 'LEACHATE_CONTAMINATION', 'STAFF_INJURY_HAZARD'],
    required: true,
  },
  severity: {
    type: String,
    enum: ['SEV_1_CRITICAL', 'SEV_2_MAJOR', 'SEV_3_MODERATE'],
    required: true,
  },
  incidentLeadId: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster', required: true },
  fieldResponderId: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster' },
  pitIdsInvolved: [{ type: Schema.Types.ObjectId, ref: 'PhysicalAsset' }],
  checklistSteps: [{
    stepText: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    _id: false,
  }],
  timeline: [{
    timestamp: { type: Date, default: Date.now },
    eventType: {
      type: String,
      enum: ['ALERT_TRIGGERED', 'INCIDENT_DECLARED', 'FIELD_RESPONDER_ARRIVED', 'ACTION_EXECUTED', 'INCIDENT_RESOLVED'],
      required: true,
    },
    description: { type: String, required: true },
    source: { type: String, enum: ['SYSTEM_SENSOR', 'HUMAN_INPUT'], default: 'SYSTEM_SENSOR' },
    actorId: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster' },
    _id: false,
  }],
  afterActionSummary: {
    narrativeSummary: { type: String },
    contributingFactors: [{ type: String }],
    correctiveActionDecisionId: { type: Schema.Types.ObjectId, ref: 'DecisionInboxItem' },
    sealedReportHash: { type: String },
  },
  status: {
    type: String,
    enum: ['ACTIVE_TRIAGE', 'CONTAINMENT_IN_PROGRESS', 'RESOLVED_CLOSED'],
    default: 'ACTIVE_TRIAGE',
  },
  declaredAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
}, { timestamps: true });

export const IncidentRoomRecord = model<IIncidentRoomRecord>('IncidentRoomRecord', IncidentRoomRecordSchema);
