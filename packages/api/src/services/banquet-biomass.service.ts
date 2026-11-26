import { Types } from 'mongoose';
import { BanquetEventPlan, IBanquetEventPlan, BanquetEventType } from '../db/models/BanquetEventPlan';

export interface PlanBanquetWasteInput {
  facilityId: string | Types.ObjectId;
  eventName: string;
  eventType: BanquetEventType;
  eventDate: Date | string;
  guestCount: number;
  isVegetarianMajority?: boolean;
}

export const GUEST_WASTE_FACTORS_KG: Record<BanquetEventType, number> = {
  WEDDING: 0.45,
  BUFFET_LUNCH: 0.35,
  COCKTAIL_DINNER: 0.30,
  CORPORATE_CONFERENCE: 0.20,
};

export class BanquetBiomassService {
  /**
   * Plans hotel event surge waste, bulking staging, and pit allocation (Feature 13).
   */
  public async planEventSurge(params: PlanBanquetWasteInput): Promise<IBanquetEventPlan> {
    const facilityObjId = new Types.ObjectId(params.facilityId.toString());
    const baseFactor = GUEST_WASTE_FACTORS_KG[params.eventType] || 0.35;
    
    // Veg buffets have slightly higher vegetable peel mass
    const adjustedFactor = params.isVegetarianMajority ? baseFactor * 1.1 : baseFactor;
    const forecastWasteKg = Math.round(params.guestCount * adjustedFactor);

    // Oily hotel banquet food requires 1:4 dry carbon bulking ratio (25%)
    const stagedBulkingMaterialKg = Math.round(forecastWasteKg * 0.25);
    const extraLabourHours = Math.max(1, Math.round(forecastWasteKg / 250));

    const plan = await BanquetEventPlan.create({
      facilityId: facilityObjId,
      eventName: params.eventName,
      eventType: params.eventType,
      eventDate: new Date(params.eventDate),
      guestCount: params.guestCount,
      isVegetarianMajority: Boolean(params.isVegetarianMajority),
      forecastWasteKg,
      wasteCharacter: params.eventType === 'WEDDING' ? 'HIGH_GREASE_OILY' : 'BALANCED',
      stagedBulkingMaterialKg,
      extraLabourHoursRequired: extraLabourHours,
    });

    return plan;
  }
}

export const banquetBiomassService = new BanquetBiomassService();
