import {
  HygieneZone,
  CrossZoneBreach,
  HygieneCheck,
  ZoneIntegrityScore,
} from '../db/models/HygieneZoning';

export class HygieneZoningService {
  private zones: Map<string, HygieneZone> = new Map();
  private breaches: CrossZoneBreach[] = [];
  private checks: HygieneCheck[] = [];

  constructor() {
    this.seedDefaultZones();
  }

  private seedDefaultZones(): void {
    const defaults: HygieneZone[] = [
      {
        zoneId: 'ZONE-RAW-01',
        facilityId: 'DEFAULT-FACILITY',
        name: 'Receiving & Hot Pits',
        type: 'RAW',
        allowedToolColor: 'RED',
        requiresBootDip: false,
        requiresHandwash: false,
      },
      {
        zoneId: 'ZONE-TRANSITION-01',
        facilityId: 'DEFAULT-FACILITY',
        name: 'Cooling & Curing Yard',
        type: 'TRANSITION',
        allowedToolColor: 'YELLOW',
        requiresBootDip: true,
        requiresHandwash: true,
      },
      {
        zoneId: 'ZONE-CLEAN-01',
        facilityId: 'DEFAULT-FACILITY',
        name: 'Finished Storage & Bagging',
        type: 'CLEAN',
        allowedToolColor: 'GREEN',
        requiresBootDip: true,
        requiresHandwash: true,
      },
    ];

    defaults.forEach((z) => this.zones.set(z.zoneId, z));
  }

  public registerZone(zone: HygieneZone): void {
    this.zones.set(zone.zoneId, zone);
  }

  public reportCrossZoneBreach(params: {
    zoneId: string;
    toolId: string;
    toolColor: 'RED' | 'YELLOW' | 'GREEN';
    reportedByUserId: string;
    affectedLotId?: string;
  }): { breach: CrossZoneBreach; lotHeldForReview: boolean } {
    const zone = this.zones.get(params.zoneId);
    if (!zone) throw new Error(`Zone ${params.zoneId} not found`);

    if (zone.allowedToolColor === params.toolColor) {
      throw new Error(
        `Tool color ${params.toolColor} is valid for zone ${zone.name}. No breach.`
      );
    }

    const breachId = `BREACH-${Date.now()}`;
    const lotHeld = zone.type === 'CLEAN' && !!params.affectedLotId;

    const breach: CrossZoneBreach = {
      breachId,
      zoneId: params.zoneId,
      toolId: params.toolId,
      toolColor: params.toolColor,
      expectedColor: zone.allowedToolColor,
      reportedByUserId: params.reportedByUserId,
      affectedLotId: params.affectedLotId,
      actionTaken: lotHeld
        ? `Clean-zone tool breach. Lot ${params.affectedLotId} quarantined pending lab swab clearance`
        : 'Tool confiscated to designated wash bay',
      timestamp: new Date().toISOString(),
    };

    this.breaches.push(breach);
    return { breach, lotHeldForReview: lotHeld };
  }

  public recordCheck(check: HygieneCheck): HygieneCheck {
    this.checks.push(check);
    return check;
  }

  public getZoneIntegrity(zoneId: string): ZoneIntegrityScore {
    const zone = this.zones.get(zoneId);
    if (!zone) throw new Error(`Zone ${zoneId} not found`);

    const thirtyDaysAgo = Date.now() - 30 * 86400 * 1000;
    const recentBreaches = this.breaches.filter(
      (b) => b.zoneId === zoneId && new Date(b.timestamp).getTime() >= thirtyDaysAgo
    );

    const recentChecks = this.checks.filter(
      (c) => c.zoneId === zoneId && new Date(c.timestamp).getTime() >= thirtyDaysAgo
    );

    let score = 100;
    score -= recentBreaches.length * 15; // 15 points penalty per breach

    const checksPassedCount = recentChecks.filter(
      (c) => c.bootDipRefreshed && c.handwashSoapStocked && c.toolsCleanedAndStored
    ).length;
    const checksCompletedPct =
      recentChecks.length > 0 ? (checksPassedCount / recentChecks.length) * 100 : 100;

    if (checksCompletedPct < 80) {
      score -= Math.round((80 - checksCompletedPct) * 0.5);
    }

    score = Math.max(0, Math.min(100, score));

    return {
      zoneId,
      score,
      breachesLast30Days: recentBreaches.length,
      checksCompletedPct: Number(checksCompletedPct.toFixed(1)),
      isCleanZoneCompromised: zone.type === 'CLEAN' && recentBreaches.length > 0,
    };
  }
}
