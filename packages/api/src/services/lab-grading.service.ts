import { CompostGrade, ILabParameters, LabSampleCustody } from '../db/models/LabSampleCustody.js';
import crypto from 'crypto';

export interface GradingEvaluation {
  assignedGrade: CompostGrade;
  passedFcoStandard: boolean;
  deviations: string[];
  summaryNote: string;
}

export class LabGradingService {
  /**
   * Deterministically grades compost test report against Fertiliser Control Order (FCO 1985)
   * and SWM 2016 statutory standards.
   */
  gradeCompostReport(params: ILabParameters): GradingEvaluation {
    const deviations: string[] = [];

    // FCO 1985 City Compost Specification Standards:
    // 1. Moisture: 15.0 - 25.0%
    if (params.moisturePercent > 25.0) {
      deviations.push(`High moisture: ${params.moisturePercent}% (FCO limit: <= 25.0%)`);
    }

    // 2. Total Organic Carbon: minimum 12.0%
    if (params.organicCarbonPercent < 12.0) {
      deviations.push(`Low organic carbon: ${params.organicCarbonPercent}% (FCO limit: >= 12.0%)`);
    }

    // 3. Total Nitrogen (as N): minimum 0.8%
    if (params.totalNitrogenPercent < 0.8) {
      deviations.push(`Low nitrogen: ${params.totalNitrogenPercent}% (FCO limit: >= 0.8%)`);
    }

    // 4. Total Phosphates (as P2O5): minimum 0.4%
    if (params.totalPhosphorusP2O5Percent < 0.4) {
      deviations.push(`Low phosphorus: ${params.totalPhosphorusP2O5Percent}% (FCO limit: >= 0.4%)`);
    }

    // 5. Total Potash (as K2O): minimum 0.4%
    if (params.totalPotassiumK2OPercent < 0.4) {
      deviations.push(`Low potassium: ${params.totalPotassiumK2OPercent}% (FCO limit: >= 0.4%)`);
    }

    // 6. C:N ratio: < 20:1
    if (params.carbonNitrogenRatio > 20.0) {
      deviations.push(`High C:N ratio: ${params.carbonNitrogenRatio}:1 (FCO limit: < 20:1)`);
    }

    // 7. pH value: 6.5 - 7.5
    if (params.phValue < 6.5 || params.phValue > 7.5) {
      deviations.push(`pH outside neutral range: ${params.phValue} (FCO standard: 6.5 - 7.5)`);
    }

    // 8. Electrical Conductivity: < 4.0 dS/m
    if (params.electricalConductivityDsPerM > 4.0) {
      deviations.push(`High salinity / EC: ${params.electricalConductivityDsPerM} dS/m (FCO limit: <= 4.0 dS/m)`);
    }

    // 9. Heavy metals compliance
    if (!params.heavyMetalsSafe) {
      deviations.push('Heavy metals concentration exceeds statutory SWM 2016 safety limits.');
    }

    let assignedGrade: CompostGrade = 'GRADE_A_FCO_PREMIUM';
    let passedFcoStandard = true;

    if (deviations.length === 0) {
      assignedGrade = 'GRADE_A_FCO_PREMIUM';
      passedFcoStandard = true;
    } else if (params.heavyMetalsSafe && params.organicCarbonPercent >= 10.0 && params.carbonNitrogenRatio <= 25.0) {
      assignedGrade = 'GRADE_B_LANDSCAPE';
      passedFcoStandard = false;
    } else {
      assignedGrade = 'GRADE_FAIL';
      passedFcoStandard = false;
    }

    let summaryNote = '';
    if (assignedGrade === 'GRADE_A_FCO_PREMIUM') {
      summaryNote = 'उत्कृष्ट खाद! FCO 1985 और SWM 2016 के सभी मानक पूर्ण हैं। प्रीमियम ग्रेड विपणन हेतु प्रमाणित। [NEEDS-NATIVE-REVIEW]';
    } else if (assignedGrade === 'GRADE_B_LANDSCAPE') {
      summaryNote = `ग्रेड B (लैंडस्केप / पार्क ग्रेड)। बागवानी और वृक्षारोपण हेतु उपयुक्त। FCO विचलन: ${deviations.join('; ')} [NEEDS-NATIVE-REVIEW]`;
    } else {
      summaryNote = `[UNFIT-FOR-SALE] खाद मानकों पर खरी नहीं उतरी। विचलन: ${deviations.join('; ')} [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      assignedGrade,
      passedFcoStandard,
      deviations,
      summaryNote,
    };
  }

  /**
   * Records a verified lab sample report in db
   */
  async recordLabReport(params: {
    sampleId: string;
    entityId: string;
    facilityId: string;
    batchId: string;
    labName: string;
    testReportNumber: string;
    parameters: ILabParameters;
    verifiedBy: string;
  }) {
    const evaluation = this.gradeCompostReport(params.parameters);

    const record = await LabSampleCustody.findOneAndUpdate(
      { sampleId: params.sampleId },
      {
        sampleId: params.sampleId,
        entityId: params.entityId,
        facilityId: params.facilityId,
        batchId: params.batchId,
        labName: params.labName,
        testReportNumber: params.testReportNumber,
        reportDate: new Date(),
        parameters: params.parameters,
        assignedGrade: evaluation.assignedGrade,
        status: 'VERIFIED',
        verifiedBy: params.verifiedBy,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return { record, evaluation };
  }
}

export const labGradingService = new LabGradingService();
