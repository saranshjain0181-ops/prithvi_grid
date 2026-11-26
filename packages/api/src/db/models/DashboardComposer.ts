import mongoose, { Document, Schema } from 'mongoose';

export type WidgetType =
  | 'KPI_CARD'
  | 'STATUS_GRID'
  | 'STAGE_FUNNEL'
  | 'HEAT_CALENDAR'
  | 'ALERT_FEED'
  | 'UNIVERSAL_CARD'
  | 'MONEY_STRIP';

export interface IWidgetContract {
  widgetId: string;
  type: WidgetType;
  title: string;
  metricKeys: string[]; // From Metric Dictionary
  allowedRoles: string[];
  refreshIntervalSeconds: number;
}

export interface IDataTrustRibbon {
  freshnessTimestamp: Date;
  dataCoveragePercent: number;
  evidenceStrengthMix: {
    strongPercent: number;
    moderatePercent: number;
    weakPercent: number;
  };
}

export interface IDashboardDefinition extends Document {
  dashboardId: string;
  role: string;
  name: string;
  widgets: IWidgetContract[];
  gridColumns: number;
  dataTrustRibbon: IDataTrustRibbon;
  createdAt: Date;
  updatedAt: Date;
}

const DashboardDefinitionSchema = new Schema<IDashboardDefinition>(
  {
    dashboardId: { type: String, required: true, unique: true, index: true },
    role: { type: String, required: true, index: true },
    name: { type: String, required: true },
    widgets: [
      {
        widgetId: { type: String, required: true },
        type: {
          type: String,
          required: true,
          enum: ['KPI_CARD', 'STATUS_GRID', 'STAGE_FUNNEL', 'HEAT_CALENDAR', 'ALERT_FEED', 'UNIVERSAL_CARD', 'MONEY_STRIP'],
        },
        title: { type: String, required: true },
        metricKeys: [{ type: String }],
        allowedRoles: [{ type: String }],
        refreshIntervalSeconds: { type: Number, default: 60 },
      },
    ],
    gridColumns: { type: Number, default: 12 },
    dataTrustRibbon: {
      freshnessTimestamp: { type: Date, default: Date.now },
      dataCoveragePercent: { type: Number, default: 100 },
      evidenceStrengthMix: {
        strongPercent: { type: Number, default: 80 },
        moderatePercent: { type: Number, default: 20 },
        weakPercent: { type: Number, default: 0 },
      },
    },
  },
  { timestamps: true }
);

export const DashboardDefinition = mongoose.model<IDashboardDefinition>(
  'DashboardDefinition',
  DashboardDefinitionSchema
);
