import { AiAlertSanjivani } from '../db/models/AiAlertSanjivani';
import { PhysicalAsset } from '../db/models/PhysicalAsset';
import { AI_THRESHOLDS } from '../config/constants';
import { sendWhatsAppAlert } from './whatsapp.service';
import type { Server as SocketIOServer } from 'socket.io';

export interface SanjivaniEvaluationResult {
  triggered: boolean;
  alertId?: string;
  reason?: string;
  cooldownActive?: boolean;
  recipe?: {
    titleHi: string;
    titleEn: string;
    instructionsHi: string[];
    instructionsEn: string[];
    immediateAction: string;
    scaledForCapacityKg: number;
  };
}

const SANJIVANI_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours hysteresis window

/**
 * AI Sanjivani Engine v2:
 * Biological trigger: pH < 5.2 AND Temp < 40°C
 * Features:
 *  - Hysteresis & debounce (no alert spamming on consecutive packets)
 *  - Proportional recipe scaling based on pit capacity
 *  - Wood ash / biochar buffering when pH is critically low (<4.8)
 */
export async function evaluateSanjivaniTrigger(
  params: {
    facilityId: string;
    nodeId: string;
    boxId?: string;
    tempC: number;
    ph: number;
    moisturePct: number;
    managerPhone?: string;
  },
  io?: SocketIOServer
): Promise<SanjivaniEvaluationResult> {
  const { facilityId, nodeId, boxId, tempC, ph, moisturePct, managerPhone } = params;

  // Evaluation criteria
  const isAcidCrash = ph < AI_THRESHOLDS.PH_ACID_CRASH;
  const isColdStall = tempC < AI_THRESHOLDS.SANJIVANI_TEMP_TRIGGER;

  if (isAcidCrash && isColdStall) {
    // 1. Check hysteresis cooldown: Do not flood alerts if an active open alert exists
    const recentAlert = await AiAlertSanjivani.findOne({
      nodeId,
      alertType: 'ACID_CRASH',
      status: { $in: ['OPEN', 'ACKNOWLEDGED'] },
      createdAt: { $gte: new Date(Date.now() - SANJIVANI_COOLDOWN_MS) },
    }).sort({ createdAt: -1 });

    if (recentAlert) {
      return {
        triggered: true,
        cooldownActive: true,
        alertId: recentAlert._id.toString(),
        reason: `Acid crash ongoing. Alert suppressed by 6-hr hysteresis window. (pH: ${ph}, Temp: ${tempC}°C)`,
      };
    }

    // 2. Fetch box asset to determine exact pit capacity and parent entity
    let capacityKg = 1000;
    let entityId: any = null;

    if (boxId) {
      const box = await PhysicalAsset.findById(boxId).lean();
      if (box) {
        capacityKg = box.capacityKg || 1000;
        entityId = box.entityId;
      }
    }

    if (!entityId && nodeId) {
      const node = await PhysicalAsset.findById(nodeId).lean();
      if (node) {
        entityId = node.entityId;
      }
    }

    // Proportional scaling factor relative to standard 1000 kg pit
    const scale = Math.max(0.2, Math.min(20, capacityKg / 1000));

    const dryLeavesKg = Math.round(15 * scale);
    const jaggeryKg = Number((3 * scale).toFixed(1));
    const warmWaterL = Math.round(10 * scale);
    const woodAshKg = ph < 4.8 ? Math.round(5 * scale) : 0;
    const turningMins = Math.min(45, Math.max(15, Math.round(15 * Math.sqrt(scale))));

    const instructionsHi = [
      `${dryLeavesKg} किलो सूखी पत्तियां या लकड़ी का सूखा भूसा (ब्राउन कार्बन) गड्ढे में फैलाएं।`,
      `${jaggeryKg} किलो गुड़ को ${warmWaterL} लीटर गुनगुने पानी में घोलकर समान रूप से छिड़कें (माइक्रोबियल ऊर्जा स्रोत)।`,
    ];

    if (woodAshKg > 0) {
      instructionsHi.push(
        `अत्यधिक एसिड क्रैश (pH ${ph}) को संतुलित करने हेतु ${woodAshKg} किलो लकड़ी की छनी हुई राख (Wood Ash) बुरकें।`
      );
    }

    instructionsHi.push(
      `कंपोस्ट को ऊपर से नीचे ${turningMins} मिनट तक अच्छी तरह पलटें (Aerate करें)।`,
      'अगले 48 घंटे तक कोई नया गीला या खट्टा कचरा न डालें।'
    );

    const instructionsEn = [
      `Add ${dryLeavesKg} kg dry leaves or coarse sawdust (carbon bulking agent).`,
      `Dissolve ${jaggeryKg} kg jaggery in ${warmWaterL}L warm water and spray evenly (microbial ignition).`,
    ];

    if (woodAshKg > 0) {
      instructionsEn.push(
        `Buffer critical acidity (pH ${ph}) with ${woodAshKg} kg sieved wood ash or agricultural lime.`
      );
    }

    instructionsEn.push(
      `Turn and aerate compost thoroughly for ${turningMins} minutes.`,
      'Halt all wet waste feeding for 48 hours until thermophilic heat returns.'
    );

    const recipe = {
      titleHi: `संजीवनी आपातकालीन कंपोस्ट पुनर्जीवन नुस्खा (${capacityKg} किग्रा गड्ढा)`,
      titleEn: `AI Sanjivani Emergency Revival Recipe (${capacityKg} kg Pit)`,
      instructionsHi,
      instructionsEn,
      immediateAction: woodAshKg > 0 ? 'MITTI_DALI, SOOKHE_PATTE_DALA, GUD_PAANI_DALA, KACHRA_GHUMAYA' : 'SOOKHE_PATTE_DALA, GUD_PAANI_DALA, KACHRA_GHUMAYA',
      scaledForCapacityKg: capacityKg,
    };

    // 3. Create single debounced alert document
    const alertDoc = await AiAlertSanjivani.create({
      entityId,
      facilityId,
      nodeId,
      boxId,
      alertType: 'ACID_CRASH',
      severity: 'CRITICAL',
      status: 'OPEN',
      triggerValues: { ph, tempC, moisturePct },
      recipeCard: {
        problem: `Biological Acid Crash & Cold Stall (pH: ${ph}, Temp: ${tempC}°C)`,
        diagnosis: `Compost biology has crashed below active thermophilic thresholds in ${capacityKg}kg pit. Anaerobic acidification stalling decomposition.`,
        actions: instructionsEn,
        estimatedRecoveryHrs: 48,
      },
      whatsappSent: false,
    });

    // 4. Real-time Socket.IO emission
    if (io) {
      io.to(`facility:${facilityId}`).emit('sanjivani:emergency', {
        alertId: alertDoc._id,
        facilityId,
        nodeId,
        boxId,
        recipe,
        triggeredAt: new Date().toISOString(),
      });
    }

    // 5. Single WhatsApp dispatch to on-duty manager
    if (managerPhone) {
      const waMsg = `🚨 *PRITHVI GRID SANJIVANI EMERGENCY ALERT*\n\nCompost Pit: ${capacityKg} kg\nStatus: Acid Crash (pH: ${ph}, Temp: ${tempC}°C)\n\n*Immediate Pit-Scaled Recipe:*\n1. ${dryLeavesKg}kg sookhe patte/bhusa milayein\n2. ${jaggeryKg}kg gud + ${warmWaterL}L paani chhidkein\n${woodAshKg > 0 ? `3. ${woodAshKg}kg lakdi ki raakh milayein\n` : ''}4. ${turningMins} min kachra ghumayein\n\nOpen app.prithvigrid.com for step-by-step guidance.`;

      sendWhatsAppAlert({ to: managerPhone, messageBody: waMsg })
        .then((ok) => {
          if (ok) {
            alertDoc.whatsappSent = true;
            alertDoc.whatsappSentAt = new Date();
            alertDoc.save().catch(console.error);
          }
        })
        .catch(console.error);
    }

    return {
      triggered: true,
      cooldownActive: false,
      alertId: alertDoc._id.toString(),
      reason: `Acid crash and cold stall detected (pH: ${ph}, Temp: ${tempC}°C)`,
      recipe,
    };
  }

  return { triggered: false };
}
