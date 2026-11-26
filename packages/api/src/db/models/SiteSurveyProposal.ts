import { Schema, model, Document, Types } from 'mongoose';

export interface ISiteSurveyProposal extends Document {
  prospectName: string;
  propertyType: 'HOTEL' | 'HOSPITAL' | 'TOWNSHIP_RWA' | 'COMMERCIAL_MALL';
  city: string;
  numberOfPits: number;
  dailyWasteKg: number;
  recommendedNodesCount: number;
  monthlySubscriptionInr: number;
  projectedAnnualSavingsInr: number;
  pilotStatus: 'SURVEY_COMPLETED' | 'PILOT_ACTIVE' | 'PILOT_CONVERTED' | 'PILOT_EXIT';
  pilotScorecard?: {
    dataCompletenessPct: number;
    labourVerificationPct: number;
    alertsPreventedCount: number;
    healthyDaysPct: number;
  };
  surveyedBy: Types.ObjectId;
  createdAt: Date;
}

export const SiteSurveyProposalSchema = new Schema<ISiteSurveyProposal>({
  prospectName: { type: String, required: true },
  propertyType: {
    type: String,
    enum: ['HOTEL', 'HOSPITAL', 'TOWNSHIP_RWA', 'COMMERCIAL_MALL'],
    required: true,
  },
  city: { type: String, required: true },
  numberOfPits: { type: Number, required: true, min: 1 },
  dailyWasteKg: { type: Number, required: true, min: 10 },
  recommendedNodesCount: { type: Number, required: true, min: 1 },
  monthlySubscriptionInr: { type: Number, required: true },
  projectedAnnualSavingsInr: { type: Number, required: true },
  pilotStatus: {
    type: String,
    enum: ['SURVEY_COMPLETED', 'PILOT_ACTIVE', 'PILOT_CONVERTED', 'PILOT_EXIT'],
    default: 'SURVEY_COMPLETED',
  },
  pilotScorecard: {
    dataCompletenessPct: { type: Number, default: 0 },
    labourVerificationPct: { type: Number, default: 0 },
    alertsPreventedCount: { type: Number, default: 0 },
    healthyDaysPct: { type: Number, default: 0 },
  },
  surveyedBy: { type: Schema.Types.ObjectId, ref: 'UserAuthRoster', required: true },
}, { timestamps: true });

export const SiteSurveyProposal = model<ISiteSurveyProposal>('SiteSurveyProposal', SiteSurveyProposalSchema);
