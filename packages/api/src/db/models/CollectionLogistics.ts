import mongoose, { Document, Schema } from 'mongoose';

export interface ICollectionStopScan {
  stopId: string;
  stopName: string;
  scannedAt: Date;
  containersCollectedCount: number;
  observedWasteWeightKg: number;
  isContaminationReported: boolean;
}

export interface ICollectionTripRecord extends Document {
  tripId: string;
  facilityId: string;
  routeId: string;
  vehicleRegistration: string;
  driverWorkerId: string;
  scheduledStopsCount: number;
  scannedStopsCount: number;
  missedStopsCount: number;
  missedStopIds: string[];
  totalCollectedMassKg: number;
  status: 'IN_TRANSIT' | 'COMPLETED' | 'MISSED_STOPS_ESCALATED';
  createdAt: Date;
}

const CollectionTripSchema = new Schema<ICollectionTripRecord>(
  {
    tripId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    routeId: { type: String, required: true, index: true },
    vehicleRegistration: { type: String, required: true },
    driverWorkerId: { type: String, required: true },
    scheduledStopsCount: { type: Number, required: true },
    scannedStopsCount: { type: Number, required: true },
    missedStopsCount: { type: Number, default: 0 },
    missedStopIds: [{ type: String }],
    totalCollectedMassKg: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ['IN_TRANSIT', 'COMPLETED', 'MISSED_STOPS_ESCALATED'],
      default: 'IN_TRANSIT',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const CollectionTrip = mongoose.model<ICollectionTripRecord>(
  'CollectionTrip',
  CollectionTripSchema
);
