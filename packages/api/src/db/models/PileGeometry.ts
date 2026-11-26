import mongoose, { Document, Schema } from 'mongoose';

export type PileStructureType = 'IN_GROUND_PIT' | 'BRICK_BAY' | 'WINDROW' | 'IN_VESSEL_DRUM';

export interface IPileGeometryRecord extends Document {
  recordId: string;
  facilityId: string;
  pitId: string;
  structureType: PileStructureType;
  heightMeters: number;
  widthMeters: number;
  lengthMeters: number;
  estimatedVolumeM3: number;
  aerationChannelsClear: boolean;
  isWithinDesignLimits: boolean;
  geometryWarnings: string[];
  measuredBy: string;
  measuredAt: Date;
}

const PileGeometrySchema = new Schema<IPileGeometryRecord>(
  {
    recordId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    pitId: { type: String, required: true, index: true },
    structureType: {
      type: String,
      required: true,
      enum: ['IN_GROUND_PIT', 'BRICK_BAY', 'WINDROW', 'IN_VESSEL_DRUM'],
      default: 'BRICK_BAY',
    },
    heightMeters: { type: Number, required: true },
    widthMeters: { type: Number, required: true },
    lengthMeters: { type: Number, required: true },
    estimatedVolumeM3: { type: Number, required: true },
    aerationChannelsClear: { type: Boolean, default: true },
    isWithinDesignLimits: { type: Boolean, default: true },
    geometryWarnings: [{ type: String }],
    measuredBy: { type: String, required: true },
    measuredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const PileGeometry = mongoose.model<IPileGeometryRecord>('PileGeometry', PileGeometrySchema);
