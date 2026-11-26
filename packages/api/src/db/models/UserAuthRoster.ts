import { Schema, model, Document, Types } from 'mongoose';
import crypto from 'crypto';

export type UserRole = 'SUPREME_HEAD' | 'BWG_MANAGER' | 'SAFAI_MITRA' | 'AUDITOR_GUEST';

export interface IAccessLog {
  at: Date;
  ip: string;
  action: string;
}

export interface IUserAuthRoster extends Document {
  entityId: Types.ObjectId;
  facilityId?: Types.ObjectId;
  name: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  assignedBoxes: Types.ObjectId[];
  assignedNodes: Types.ObjectId[];
  shiftStart: string;  // HH:MM
  shiftEnd: string;    // HH:MM
  activeDays: string[]; // ['MON','TUE',...]
  refreshTokenHash?: string;
  otpHash?: string;
  otpExpiresAt?: Date;
  otpSessionId?: string;
  accessLogs: IAccessLog[];
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  compareOtp(otp: string): boolean;
  setOtp(otp: string): void;
}

const AccessLogSchema = new Schema<IAccessLog>(
  {
    at: { type: Date, default: Date.now },
    ip: { type: String, required: true },
    action: { type: String, required: true },
  },
  { _id: false }
);

const UserAuthRosterSchema = new Schema<IUserAuthRoster>(
  {
    entityId: { type: Schema.Types.ObjectId, ref: 'GlobalEntity', required: true, index: true },
    facilityId: { type: Schema.Types.ObjectId, ref: 'FacilityLocation' },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    role: {
      type: String,
      enum: ['SUPREME_HEAD', 'BWG_MANAGER', 'SAFAI_MITRA'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    assignedBoxes: [{ type: Schema.Types.ObjectId, ref: 'PhysicalAsset' }],
    assignedNodes: [{ type: Schema.Types.ObjectId, ref: 'PhysicalAsset' }],
    shiftStart: { type: String, default: '06:00' },
    shiftEnd: { type: String, default: '18:00' },
    activeDays: {
      type: [String],
      enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      default: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    },
    refreshTokenHash: { type: String, select: false },
    otpHash: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    otpSessionId: { type: String, select: false },
    accessLogs: { type: [AccessLogSchema], default: [] },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

UserAuthRosterSchema.index({ entityId: 1, role: 1 });

/**
 * Hash and store OTP
 */
UserAuthRosterSchema.methods.setOtp = function (otp: string): void {
  this.otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  this.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
};

/**
 * Compare plain OTP against stored hash
 */
UserAuthRosterSchema.methods.compareOtp = function (otp: string): boolean {
  if (!this.otpHash || !this.otpExpiresAt) return false;
  if (new Date() > this.otpExpiresAt) return false;
  const hash = crypto.createHash('sha256').update(otp).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(this.otpHash));
};

export const UserAuthRoster = model<IUserAuthRoster>('UserAuthRoster', UserAuthRosterSchema);
