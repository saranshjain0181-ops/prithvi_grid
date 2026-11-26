import crypto from 'node:crypto';
import { IRegisterLineItem, StatutoryAuthority } from '../db/models/RegistersReturnsGenerator.js';

export interface CompiledReturnResult {
  returnId: string;
  reportingPeriodMonth: string;
  authority: StatutoryAuthority;
  totalFieldsCount: number;
  autofilledFieldsCount: number;
  autofillCompletenessPct: number;
  missingDataGaps: string[];
  isAttestationPermitted: boolean;
  digitalTamperHashSha256: string;
  statusMessageHindi: string;
}

export class RegistersReturnsService {
  /**
   * Deterministically compiles statutory registers and returns directly from immutable audit ledgers
   */
  compileReturn(params: {
    facilityId: string;
    reportingPeriodMonth: string; // YYYY-MM
    authority: StatutoryAuthority;
    items: IRegisterLineItem[];
    allowAttestationWithGaps?: boolean;
  }): CompiledReturnResult {
    const returnId = `RET-${params.authority}-${params.reportingPeriodMonth}-${Date.now()}`;
    const totalFields = params.items.length;
    const autofilledCount = params.items.filter((i) => i.isAutofilled && i.compiledValue.trim().length > 0).length;

    const missingDataGaps = params.items
      .filter((i) => !i.compiledValue || i.compiledValue.trim().length === 0)
      .map((i) => i.fieldLabel);

    const autofillCompletenessPct = totalFields > 0
      ? Math.round((autofilledCount / totalFields) * 100 * 10) / 10
      : 0;

    const isAttestationPermitted = missingDataGaps.length === 0 || !!params.allowAttestationWithGaps;

    // Cryptographic tamper seal
    const payloadToHash = JSON.stringify({
      returnId,
      facilityId: params.facilityId,
      period: params.reportingPeriodMonth,
      authority: params.authority,
      completeness: autofillCompletenessPct,
      items: params.items,
    });
    const digitalTamperHashSha256 = crypto.createHash('sha256').update(payloadToHash).digest('hex');

    let statusMessageHindi = '';
    if (isAttestationPermitted && missingDataGaps.length === 0) {
      statusMessageHindi = `वैधानिक विवरणी 100% पूर्ण (${autofilledCount}/${totalFields} फ़ील्ड ऑटो-भरे गए)। डिजिटल सत्यापन (Maker-Checker Attestation) हेतु तैयार। [LEGAL-REVIEW] [NEEDS-NATIVE-REVIEW]`;
    } else {
      statusMessageHindi = `अपूर्ण डेटा: ${missingDataGaps.length} फ़ील्ड रिक्त हैं (${missingDataGaps.slice(0, 3).join(', ')}). सत्यापन से पूर्व डेटा प्रविष्टियां पूर्ण करें। [NEEDS-NATIVE-REVIEW]`;
    }

    return {
      returnId,
      reportingPeriodMonth: params.reportingPeriodMonth,
      authority: params.authority,
      totalFieldsCount: totalFields,
      autofilledFieldsCount: autofilledCount,
      autofillCompletenessPct,
      missingDataGaps,
      isAttestationPermitted,
      digitalTamperHashSha256,
      statusMessageHindi,
    };
  }
}

export const registersReturnsService = new RegistersReturnsService();
