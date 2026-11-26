import mongoose, { Document, Schema } from 'mongoose';

export type LeachateColor = 'LIGHT_AMBER' | 'DARK_BROWN' | 'BLACK_SLUDGE';
export type LeachateOdor = 'FERMENTED_SWEET' | 'PUNGENT_SOUR' | 'ANAEROBIC_SEWER';

export interface ILeachateRecirculation {
  recirculationId: string;
  targetPitId: string;
  volumeLiters: number;
  dilutionRatio: string; // e.g. '1:0' (pure) or '1:5' (diluted)
  pitCoreTempC: number;
  isAllowed: boolean;
  appliedBy: string;
  appliedAt: Date;
}

export interface ILeachateSumpRecord extends Document {
  recordId: string;
  entityId: string;
  facilityId: string;
  sumpId: string;
  capacityLiters: number;
  currentLevelLiters: number;
  fillPercentage: number;
  colorGrade: LeachateColor;
  odorGrade: LeachateOdor;
  phValue?: number;
  recirculations: ILeachateRecirculation[];
  recordedBy: string;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeachateLoopSchema = new Schema<ILeachateSumpRecord>(
  {
    recordId: { type: String, required: true, unique: true, index: true },
    entityId: { type: String, required: true, index: true },
    facilityId: { type: String, required: true, index: true },
    sumpId: { type: String, required: true, index: true },
    capacityLiters: { type: Number, required: true, default: 1000 },
    currentLevelLiters: { type: Number, required: true },
    fillPercentage: { type: Number, required: true },
    colorGrade: {
      type: String,
      required: true,
      enum: ['LIGHT_AMBER', 'DARK_BROWN', 'BLACK_SLUDGE'],
    },
    odorGrade: {
      type: String,
      required: true,
      enum: ['FERMENTED_SWEET', 'PUNGENT_SOUR', 'ANAEROBIC_SEWER'],
    },
    phValue: { type: Number },
    recirculations: [
      {
        recirculationId: { type: String, required: true },
        targetPitId: { type: String, required: true },
        volumeLiters: { type: Number, required: true },
        dilutionRatio: { type: String, default: '1:0' },
        pitCoreTempC: { type: Number, required: true },
        isAllowed: { type: Boolean, required: true },
        appliedBy: { type: String, required: true },
        appliedAt: { type: Date, default: Date.now },
      },
    ],
    recordedBy: { type: String, required: true },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

LeachateLoopSchema.index({ facilityId: 1, sumpId: 1, recordedAt: -1 });

export const LeachateLoop = mongoose.model<ILeachateSumpRecord>('LeachateLoop', LeachateLoopSchema);
