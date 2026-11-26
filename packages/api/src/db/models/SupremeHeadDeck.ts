import mongoose, { Document, Schema } from 'mongoose';

export interface ISupremeSectionMetric {
  sectionKey:
    | 'BUSINESS_ARR'
    | 'FLEET_RELIABILITY'
    | 'ESG_DIVERSION'
    | 'REGULATORY_RISK'
    | 'CLIENT_HEALTH'
    | 'UNIT_ECONOMICS'
    | 'AI_GATEWAY'
    | 'EXECUTIVE_ACTIONS';
  title: string;
  status: 'GREEN' | 'AMBER' | 'RED';
  primaryValue: string;
  comparisonDelta: string;
  insights: string[];
}

export interface ISupremeHeadSnapshotRecord extends Document {
  snapshotId: string;
  asOfDate: string; // YYYY-MM-DD
  activeFacilitiesCount: number;
  activeNodesCount: number;
  totalWetWasteDivertedTons: number;
  avoidedMethaneKg: number;
  sections: ISupremeSectionMetric[];
  mondayBriefMarkdown?: string;
  createdAt: Date;
}

const SupremeHeadSnapshotSchema = new Schema<ISupremeHeadSnapshotRecord>(
  {
    snapshotId: { type: String, required: true, unique: true, index: true },
    asOfDate: { type: String, required: true, index: true },
    activeFacilitiesCount: { type: Number, required: true },
    activeNodesCount: { type: Number, required: true },
    totalWetWasteDivertedTons: { type: Number, required: true },
    avoidedMethaneKg: { type: Number, required: true },
    sections: [
      {
        sectionKey: { type: String, required: true },
        title: { type: String, required: true },
        status: { type: String, required: true, enum: ['GREEN', 'AMBER', 'RED'] },
        primaryValue: { type: String, required: true },
        comparisonDelta: { type: String, required: true },
        insights: [{ type: String }],
      },
    ],
    mondayBriefMarkdown: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SupremeHeadSnapshot = mongoose.model<ISupremeHeadSnapshotRecord>(
  'SupremeHeadSnapshot',
  SupremeHeadSnapshotSchema
);
