export interface CollectionTripEvaluationResult {
  scheduledStopsCount: number;
  scannedStopsCount: number;
  missedStopsCount: number;
  missedStopIds: string[];
  missedStopRatePct: number;
  totalCollectedMassKg: number;
  vehicleDocumentsCompliant: boolean;
  documentWarnings: string[];
  escalationStatus: 'CLEARED' | 'MISSED_STOPS_ESCALATED' | 'VEHICLE_GROUNDED_DOC_EXPIRED';
  summaryHindi: string;
}

export class CollectionLogisticsService {
  /**
   * Deterministically validates collection route completion, missed stops and vehicle compliance
   */
  evaluateCollectionTrip(params: {
    scheduledStopIds: string[];
    scannedStops: Array<{
      stopId: string;
      scannedAt: Date;
      massKg: number;
    }>;
    vehicleDocuments?: {
      fitnessExpiresAt: Date;
      insuranceExpiresAt: Date;
      pucExpiresAt: Date;
    };
  }): CollectionTripEvaluationResult {
    const scheduledCount = params.scheduledStopIds.length;
    const scannedSet = new Set(params.scannedStops.map((s) => s.stopId));

    const missedStopIds = params.scheduledStopIds.filter((id) => !scannedSet.has(id));
    const scannedCount = params.scannedStops.length;
    const missedCount = missedStopIds.length;

    const missedStopRatePct = scheduledCount > 0
      ? Math.round((missedCount / scheduledCount) * 100 * 10) / 10
      : 0;

    const totalCollectedMassKg = params.scannedStops.reduce((acc, s) => acc + s.massKg, 0);

    // Vehicle Document Compliance Check
    const documentWarnings: string[] = [];
    let vehicleDocumentsCompliant = true;
    const now = new Date();

    if (params.vehicleDocuments) {
      if (params.vehicleDocuments.fitnessExpiresAt < now) {
        vehicleDocumentsCompliant = false;
        documentWarnings.push('वाहन फिटनेस प्रमाणपत्र (Fitness Certificate) समाप्त। [LEGAL-REVIEW]');
      }
      if (params.vehicleDocuments.insuranceExpiresAt < now) {
        vehicleDocumentsCompliant = false;
        documentWarnings.push('वाहन बीमा (Insurance Policy) समाप्त। [LEGAL-REVIEW]');
      }
      if (params.vehicleDocuments.pucExpiresAt < now) {
        vehicleDocumentsCompliant = false;
        documentWarnings.push('प्रदूषण नियंत्रण प्रमाणपत्र (PUC) समाप्त। [LEGAL-REVIEW]');
      }
    }

    let escalationStatus: 'CLEARED' | 'MISSED_STOPS_ESCALATED' | 'VEHICLE_GROUNDED_DOC_EXPIRED' = 'CLEARED';
    let summaryHindi = '';

    if (!vehicleDocumentsCompliant) {
      escalationStatus = 'VEHICLE_GROUNDED_DOC_EXPIRED';
      summaryHindi = 'चेतावनी: वाहन के वैधानिक दस्तावेज समाप्त। वाहन का परिचालन तत्काल रोकें। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]';
    } else if (missedCount > 0) {
      escalationStatus = 'MISSED_STOPS_ESCALATED';
      summaryHindi = `${missedCount} कचरा संग्रहण पॉइंट छूटे हैं (Missed Stops: ${missedStopIds.join(', ')}). पर्यवेक्षक को पुनः रूटिंग भेजी गई। [NEEDS-NATIVE-REVIEW]`;
    } else {
      summaryHindi = `रूट पूर्ण: सभी ${scheduledCount} पॉइंट से कचरा एकत्र हुआ (${totalCollectedMassKg} kg). [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      scheduledStopsCount: scheduledCount,
      scannedStopsCount: scannedCount,
      missedStopsCount: missedCount,
      missedStopIds,
      missedStopRatePct,
      totalCollectedMassKg,
      vehicleDocumentsCompliant,
      documentWarnings,
      escalationStatus,
      summaryHindi,
    };
  }
}

export const collectionLogisticsService = new CollectionLogisticsService();
