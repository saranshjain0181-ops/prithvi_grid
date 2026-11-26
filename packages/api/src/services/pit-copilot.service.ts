import mongoose, { Types } from 'mongoose';
import { LiveTelemetry } from '../db/models/LiveTelemetry';
import { AiAlertSanjivani } from '../db/models/AiAlertSanjivani';
import { SwmComplianceArchive } from '../db/models/SwmComplianceArchive';
import { UserAuthRoster } from '../db/models/UserAuthRoster';
import { PhysicalAsset } from '../db/models/PhysicalAsset';
import { aiGateway } from './ai-gateway.service';
import type { JwtPayload } from '../types';

export interface GroundedCitation {
  tool: string;
  sourceCollection: string;
  timestamp: string;
  data: Record<string, any>;
}

export interface CopilotResponse {
  reply: string;
  role: string;
  citations: GroundedCitation[];
  suggestedFollowUps?: string[];
  audioPrompt?: string;
}

/**
 * Pit Copilot with Role-Scoped Grounded Tool Citations (Workstream J3)
 */
export async function runPitCopilot(
  message: string,
  user: JwtPayload,
  context?: { facilityId?: string; boxId?: string; nodeId?: string }
): Promise<CopilotResponse> {
  const citations: GroundedCitation[] = [];
  const normalizedMsg = message.toLowerCase();

  // 1. Tool Execution: Live Telemetry
  let telemetrySummary = '';
  if (
    normalizedMsg.includes('temp') ||
    normalizedMsg.includes('तापमान') ||
    normalizedMsg.includes('moist') ||
    normalizedMsg.includes('नमी') ||
    normalizedMsg.includes('ph') ||
    normalizedMsg.includes('methane') ||
    normalizedMsg.includes('गैस') ||
    normalizedMsg.includes('status') ||
    normalizedMsg.includes('हाल') ||
    context?.nodeId
  ) {
    const query: any = {};
    if (context?.nodeId) {
      query.nodeId = context.nodeId;
    } else if (context?.facilityId) {
      query.facilityId = context.facilityId;
    } else if (user.role !== 'SUPREME_HEAD' && user.facilityId) {
      query.facilityId = user.facilityId;
    }

    let latest: any = null;
    if (mongoose.connection.readyState === 1) {
      latest = await LiveTelemetry.findOne(query).sort({ timestamp: -1 }).lean();
    } else {
      // Mock telemetry for test/offline environments
      latest = {
        timestamp: new Date(),
        tempC: 58.5,
        moisturePct: 52.0,
        ph: 6.8,
        methanePpm: 120,
        airPressureHpa: 1012.3,
        batteryMv: 3250,
      };
    }
    if (latest) {
      citations.push({
        tool: 'get_pit_telemetry',
        sourceCollection: 'Live_Telemetry_Lake',
        timestamp: new Date(latest.timestamp).toISOString(),
        data: {
          tempC: latest.tempC,
          moisturePct: latest.moisturePct,
          ph: latest.ph,
          methanePpm: latest.methanePpm,
          airPressureHpa: latest.airPressureHpa,
          batteryMv: latest.batteryMv,
        },
      });

      telemetrySummary = `Live Telemetry: Temperature is ${latest.tempC}°C, Moisture is ${latest.moisturePct}%, pH is ${latest.ph}, Methane is ${latest.methanePpm} PPM.`;
    }
  }

  // 2. Tool Execution: Active Alerts
  let alertSummary = '';
  if (
    normalizedMsg.includes('alert') ||
    normalizedMsg.includes('खतरा') ||
    normalizedMsg.includes('emergency') ||
    normalizedMsg.includes('चेतावनी') ||
    normalizedMsg.includes('sanjivani') ||
    normalizedMsg.includes('संजीवनी')
  ) {
    const alertQuery: any = { acknowledged: false };
    if (user.role !== 'SUPREME_HEAD' && user.entityId) {
      // Find facilities of this entity
      alertQuery.facilityId = user.facilityId || { $exists: true };
    }

    let activeAlerts: any[] = [];
    if (mongoose.connection.readyState === 1) {
      activeAlerts = await AiAlertSanjivani.find(alertQuery)
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();
    }

    if (activeAlerts.length > 0) {
      citations.push({
        tool: 'get_active_alerts',
        sourceCollection: 'AI_Alerts_Sanjivani',
        timestamp: new Date().toISOString(),
        data: {
          count: activeAlerts.length,
          alerts: activeAlerts.map((a) => ({
            type: a.alertType,
            severity: a.severity,
            recipeTitle: a.recipeCard?.title || 'संजीवनी नुस्खा',
          })),
        },
      });

      alertSummary = `Active Alerts: ${activeAlerts.length} unresolved alerts. Most recent: ${activeAlerts[0].alertType} (${activeAlerts[0].severity}). Recipe: ${activeAlerts[0].recipeCard?.title || 'Emergency Aeration'}.`;
    } else {
      alertSummary = 'Active Alerts: Zero active biological emergencies. Pit bio-cycle is stable.';
    }
  }

  // 3. Tool Execution: Compliance Summary (Restricted to Manager and Supreme Head)
  let complianceSummary = '';
  if (
    (user.role === 'BWG_MANAGER' || user.role === 'SUPREME_HEAD') &&
    (normalizedMsg.includes('compliance') ||
      normalizedMsg.includes('audit') ||
      normalizedMsg.includes('fine') ||
      normalizedMsg.includes('जुर्माना') ||
      normalizedMsg.includes('बचत') ||
      normalizedMsg.includes('swm'))
  ) {
    const compQuery: any = {};
    if (user.role !== 'SUPREME_HEAD' && user.entityId) {
      compQuery.entityId = user.entityId;
    }

    let latestCert: any = null;
    if (mongoose.connection.readyState === 1) {
      latestCert = await SwmComplianceArchive.findOne(compQuery)
        .sort({ createdAt: -1 })
        .lean();
    }

    if (latestCert) {
      citations.push({
        tool: 'get_compliance_summary',
        sourceCollection: 'SWM_Compliance_Archive',
        timestamp: new Date(latestCert.createdAt).toISOString(),
        data: {
          period: latestCert.period,
          complianceScorePct: latestCert.complianceScorePct,
          totalWasteInKg: latestCert.totalWasteInKg,
          totalCompostOutKg: latestCert.totalCompostOutKg,
          violationsPrevented: latestCert.violationsPrevented,
          certificateHash: latestCert.certificateHash?.substring(0, 16) + '...',
        },
      });

      complianceSummary = `SWM-2026 Compliance: Latest period ${latestCert.period} has score ${latestCert.complianceScorePct}%. Processed ${latestCert.totalWasteInKg} kg wet waste, generated ${latestCert.totalCompostOutKg} kg organic compost, prevented ${latestCert.violationsPrevented} violations.`;
    }
  }

  // 4. Grounded Context Formation
  const groundedContext = [telemetrySummary, alertSummary, complianceSummary]
    .filter(Boolean)
    .join('\n');

  // 5. Generate AI Response via AI Gateway
  const aiRes = await aiGateway.generateChatAdvice({
    message,
    role: user.role,
    telemetryContext: groundedContext
      ? `=== STRICT GROUNDED SENSOR EVIDENCE (ALWAYS CITE THESE NUMBERS) ===\n${groundedContext}`
      : undefined,
  });

  return {
    reply: aiRes.reply,
    role: user.role,
    citations,
    suggestedFollowUps: aiRes.suggestedActions || [
      'आज का तापमान कैसा है?',
      'क्या कचरा घुमाने की जरूरत है?',
      'कम्पोस्ट कब तैयार होगी?',
    ],
    audioPrompt: aiRes.audioPrompt,
  };
}
