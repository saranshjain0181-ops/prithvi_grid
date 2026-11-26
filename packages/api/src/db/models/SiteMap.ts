import mongoose, { Document, Schema } from 'mongoose';

export type ZoneType =
  | 'PIT_CLUSTER'
  | 'CURING_AREA'
  | 'SCREENING_LINE'
  | 'HOLDING_AREA'
  | 'LEACHATE_SUMP'
  | 'WATER_POINT'
  | 'TOOL_SHED'
  | 'SENSITIVE_ZONE_HOTEL_GUEST'
  | 'SENSITIVE_ZONE_HOSPITAL_WARD'
  | 'WEIGHBRIDGE_INFLOW';

export interface IMapZone {
  zoneId: string;
  name: string;
  type: ZoneType;
  xMeters: number;
  yMeters: number;
  widthMeters: number;
  heightMeters: number;
  odorBufferMeters: number; // minimum buffer distance to sensitive areas
}

export interface IMapNodePlacement {
  nodeId: string;
  pitId?: string;
  xMeters: number;
  yMeters: number;
  label: string;
}

export interface IWalkingEdge {
  fromNodeId: string;
  toNodeId: string;
  distanceMeters: number;
}

export interface ISiteMap extends Document {
  siteMapId: string;
  entityId: string;
  facilityId: string;
  name: string;
  version: number;
  boundsWidthMeters: number;
  boundsHeightMeters: number;
  metersPerPixel: number;
  satelliteOverlayUrl?: string;
  zones: IMapZone[];
  nodes: IMapNodePlacement[];
  walkingEdges: IWalkingEdge[];
  createdAt: Date;
  updatedAt: Date;
}

const SiteMapSchema = new Schema<ISiteMap>(
  {
    siteMapId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    version: { type: Number, default: 1 },
    boundsWidthMeters: { type: Number, required: true, default: 100 },
    boundsHeightMeters: { type: Number, required: true, default: 100 },
    metersPerPixel: { type: Number, default: 0.1 },
    satelliteOverlayUrl: { type: String },
    zones: [
      {
        zoneId: { type: String, required: true },
        name: { type: String, required: true },
        type: {
          type: String,
          required: true,
          enum: [
            'PIT_CLUSTER',
            'CURING_AREA',
            'SCREENING_LINE',
            'HOLDING_AREA',
            'LEACHATE_SUMP',
            'WATER_POINT',
            'TOOL_SHED',
            'SENSITIVE_ZONE_HOTEL_GUEST',
            'SENSITIVE_ZONE_HOSPITAL_WARD',
            'WEIGHBRIDGE_INFLOW',
          ],
        },
        xMeters: { type: Number, required: true },
        yMeters: { type: Number, required: true },
        widthMeters: { type: Number, required: true },
        heightMeters: { type: Number, required: true },
        odorBufferMeters: { type: Number, default: 15 },
      },
    ],
    nodes: [
      {
        nodeId: { type: String, required: true },
        pitId: { type: String },
        xMeters: { type: Number, required: true },
        yMeters: { type: Number, required: true },
        label: { type: String, required: true },
      },
    ],
    walkingEdges: [
      {
        fromNodeId: { type: String, required: true },
        toNodeId: { type: String, required: true },
        distanceMeters: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

SiteMapSchema.index({ facilityId: 1, version: -1 });

export const SiteMap = mongoose.model<ISiteMap>('SiteMap', SiteMapSchema);
