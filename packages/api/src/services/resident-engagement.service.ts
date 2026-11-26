import { ITowerParticipation } from '../db/models/ResidentEngagement.js';

export interface ResidentVoucherAllocation {
  voucherCode: string;
  residentId: string;
  towerId: string;
  flatNumber: string;
  allocatedBagsCount: number;
  bagWeightKg: number;
  validityDays: number;
  messageHindi: string;
}

export class ResidentEngagementService {
  /**
   * Computes tower leaderboard rankings based on waste segregation scores and participation
   */
  rankTowers(towers: Array<{
    towerId: string;
    towerName: string;
    totalFlatsCount: number;
    participatingFlatsCount: number;
    monthlyWasteKg: number;
    segregationScorePct: number;
  }>): ITowerParticipation[] {
    const scored = towers.map((t) => {
      const participationPct = t.totalFlatsCount > 0
        ? Math.round((t.participatingFlatsCount / t.totalFlatsCount) * 100)
        : 0;

      return {
        ...t,
        participationPct,
        rank: 0,
      };
    });

    // Rank primarily by segregationScorePct, then by participationPct
    scored.sort((a, b) => {
      if (b.segregationScorePct !== a.segregationScorePct) {
        return b.segregationScorePct - a.segregationScorePct;
      }
      return b.participationPct - a.participationPct;
    });

    return scored.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }

  /**
   * Generates black gold compost return coupon for participating residents
   */
  allocateVoucher(params: {
    residentId: string;
    towerId: string;
    flatNumber: string;
    contributedWasteKg: number;
    kgPerBagRatio?: number; // default 50kg wet waste yields 1 bag of 5kg compost
  }): ResidentVoucherAllocation {
    const ratio = params.kgPerBagRatio ?? 50;
    const bags = Math.max(1, Math.floor(params.contributedWasteKg / ratio));
    const code = `PG-VOUCHER-${params.towerId.toUpperCase()}-${params.flatNumber.replace(/[^A-Za-z0-9]/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    return {
      voucherCode: code,
      residentId: params.residentId,
      towerId: params.towerId,
      flatNumber: params.flatNumber,
      allocatedBagsCount: bags,
      bagWeightKg: 5,
      validityDays: 30,
      messageHindi: `बधाई! आपके फ्लैट (${params.flatNumber}) ने ${params.contributedWasteKg}kg गीला कचरा सफलतापूर्वक अलग कर दिया है। आपको ${bags} बैग (5kg) जैविक खाद का वाउचर प्राप्त हुआ है। [NEEDS-NATIVE-REVIEW]`,
    };
  }
}

export const residentEngagementService = new ResidentEngagementService();
