import { Types } from 'mongoose';
import { BulkingInventory, IBulkingInventoryItem, BulkingMaterialType } from '../db/models/BulkingInventory';
import { decisionInboxService } from './decision-inbox.service';

export interface BulkingConsumptionParams {
  facilityId: string | Types.ObjectId;
  materialType: BulkingMaterialType;
  usedKg: number;
}

export class BulkingInventoryService {
  /**
   * Records material consumption and triggers reorder autopilot if stock drops below reorder point (Feature 12).
   */
  public async recordConsumptionAndCheckReorder(params: BulkingConsumptionParams): Promise<IBulkingInventoryItem> {
    const facilityObjId = new Types.ObjectId(params.facilityId.toString());

    let item = await BulkingInventory.findOne({
      facilityId: facilityObjId,
      materialType: params.materialType,
    });

    if (!item) {
      item = await BulkingInventory.create({
        facilityId: facilityObjId,
        materialType: params.materialType,
        currentStockKg: 500,
        reorderPointKg: 150,
        daysOfCover: 12,
        preferredSupplier: {
          supplierName: 'Indore Sawmill & Agro Biomass Traders',
          phone: '+919876500112',
          ratePerKgInr: 4.5,
          leadTimeDays: 2,
        },
        allowedSubstitutes: ['COCOPEAT', 'DRY_LEAVES'],
        status: 'OPTIMAL',
      });
    }

    item.currentStockKg = Math.max(0, item.currentStockKg - params.usedKg);
    const dailyConsumptionAvg = 25; // kg/day
    item.daysOfCover = Number((item.currentStockKg / dailyConsumptionAvg).toFixed(1));

    if (item.currentStockKg <= 50) {
      item.status = 'CRITICALLY_LOW';
    } else if (item.currentStockKg <= item.reorderPointKg) {
      item.status = 'REORDER_DUE';
    } else {
      item.status = 'OPTIMAL';
    }

    await item.save();

    // Trigger Decision Inbox item if reorder is due
    if (item.status === 'REORDER_DUE' || item.status === 'CRITICALLY_LOW') {
      const orderKg = 300;
      const totalCostInr = orderKg * item.preferredSupplier.ratePerKgInr;

      await decisionInboxService.createDecisionItem({
        tenantId: '671500000000000000000001',
        facilityId: facilityObjId,
        decisionType: 'REORDER_BULKING',
        title: `Reorder ${item.materialType} Stock (${item.daysOfCover} days cover remaining)`,
        summaryReason: `Current stock (${item.currentStockKg} kg) is below reorder point (${item.reorderPointKg} kg). Pit aeration will be impaired if sawdust depletes.`,
        recommendedOption: `Order ${orderKg} kg from ${item.preferredSupplier.supplierName} @ ₹${item.preferredSupplier.ratePerKgInr}/kg (Total: ₹${totalCostInr})`,
        alternativeOptions: [
          `Substitute with ${item.allowedSubstitutes[0]} from backup supplier`,
          'Defer order by 3 days',
        ],
        estimatedCostInr: totalCostInr,
        consequenceOfInaction: 'Running out of bulking carbon will cause anaerobic wet pit crash and severe foul odor complaints.',
        evidenceStrengthTier: 'STRONG',
      });
    }

    return item;
  }
}

export const bulkingInventoryService = new BulkingInventoryService();
