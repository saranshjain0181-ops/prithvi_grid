import mongoose, { Document, Schema } from 'mongoose';

export type CertificationSkill =
  | 'SHREDDER_OPERATOR'
  | 'DEWATERING_OPERATOR'
  | 'MANUAL_TURNING_ERGONOMICS'
  | 'INOCULANT_PREPARATION'
  | 'ODOR_BIOFILTER_MAINTENANCE'
  | 'RECEIVING_GATE_SEGREGATION';

export interface IWorkerCertificationRecord extends Document {
  certificationId: string;
  facilityId: string;
  workerId: string;
  skill: CertificationSkill;
  audioModuleCompleted: boolean;
  practicalAssessmentScorePct: number;
  evaluatedBySupervisorId: string;
  issuedAt: Date;
  expiresAt: Date;
  isRevoked: boolean;
  revocationReason?: string;
  createdAt: Date;
}

const WorkerCertificationSchema = new Schema<IWorkerCertificationRecord>(
  {
    certificationId: { type: String, required: true, unique: true, index: true },
    facilityId: { type: String, required: true, index: true },
    workerId: { type: String, required: true, index: true },
    skill: {
      type: String,
      required: true,
      enum: [
        'SHREDDER_OPERATOR',
        'DEWATERING_OPERATOR',
        'MANUAL_TURNING_ERGONOMICS',
        'INOCULANT_PREPARATION',
        'ODOR_BIOFILTER_MAINTENANCE',
        'RECEIVING_GATE_SEGREGATION',
      ],
    },
    audioModuleCompleted: { type: Boolean, default: false },
    practicalAssessmentScorePct: { type: Number, required: true },
    evaluatedBySupervisorId: { type: String, required: true },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    isRevoked: { type: Boolean, default: false },
    revocationReason: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const WorkerCertification = mongoose.model<IWorkerCertificationRecord>(
  'WorkerCertification',
  WorkerCertificationSchema
);
