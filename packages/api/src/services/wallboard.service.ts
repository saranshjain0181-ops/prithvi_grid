import { IKioskWorkerProfile, IYardWallboard, WallboardWidgetType, YardWallboard } from '../db/models/YardWallboard.js';
import crypto from 'crypto';

export class WallboardService {
  /**
   * Hashes a 4-digit worker kiosk PIN deterministically
   */
  hashPin(pin: string, salt: string = 'pg_kiosk_salt_2026'): string {
    return crypto.createHash('sha256').update(`${pin}:${salt}`).digest('hex');
  }

  /**
   * Fast 1-second PIN verification for worker avatar login on shared yard tablet
   */
  verifyWorkerPin(worker: IKioskWorkerProfile, enteredPin: string): boolean {
    const enteredHash = this.hashPin(enteredPin);
    return worker.pinHash === enteredHash;
  }

  /**
   * Evaluates wallboard widget layout validity
   */
  evaluateLayout(activeWidgets: WallboardWidgetType[]): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    if (activeWidgets.length === 0) {
      warnings.push('At least one widget must be enabled for the wallboard display.');
    }
    if (activeWidgets.length > 6) {
      warnings.push('Display overcrowding: More than 6 widgets reduces visibility from a distance.');
    }
    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Creates or updates a yard wallboard display config
   */
  async configureWallboard(params: {
    entityId: string;
    facilityId: string;
    pairedDisplayPin: string;
    screenOrientation?: 'LANDSCAPE' | 'PORTRAIT';
    activeWidgets: WallboardWidgetType[];
    refreshIntervalSeconds?: number;
    kioskWorkers?: Array<{ workerId: string; name: string; avatarIcon: string; pin: string }>;
  }): Promise<IYardWallboard> {
    const wallboardId = `WB-${params.facilityId}`;

    const kioskWorkers: IKioskWorkerProfile[] = (params.kioskWorkers || []).map((w) => ({
      workerId: w.workerId,
      name: w.name,
      avatarIcon: w.avatarIcon,
      pinHash: this.hashPin(w.pin),
    }));

    const wallboard = await YardWallboard.findOneAndUpdate(
      { facilityId: params.facilityId },
      {
        wallboardId,
        entityId: params.entityId,
        facilityId: params.facilityId,
        pairedDisplayPin: params.pairedDisplayPin,
        screenOrientation: params.screenOrientation || 'LANDSCAPE',
        activeWidgets: params.activeWidgets,
        refreshIntervalSeconds: params.refreshIntervalSeconds || 30,
        kioskWorkers,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return wallboard;
  }
}

export const wallboardService = new WallboardService();
