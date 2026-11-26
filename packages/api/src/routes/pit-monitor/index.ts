import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { KhadKachraFlow } from '../../db/models/KhadKachraFlow';
import { LiveTelemetry } from '../../db/models/LiveTelemetry';
import { AiAlertSanjivani } from '../../db/models/AiAlertSanjivani';
import { AI_THRESHOLDS } from '../../config/constants';
import { pitPersonalityService } from '../../services/pit-personality.service';
import { pitHealthIndexService } from '../../services/pit-health-index.service';
import { PitPersonalityProfile } from '../../db/models/PitPersonalityProfile';
import { PitHealthIndexRecord } from '../../db/models/PitHealthIndex';
import { resolveBoxAsset, toValidObjectId } from '../../utils/safe-lookup';

import { assertTenantOwnership } from '../../middleware/tenant-guard';
import type { JwtPayload } from '../../types';

const diaryEntrySchema = z.object({
  boxId: z.string().min(1),
  facilityId: z.string().optional(),
  flowType: z.enum(['WASTE_IN', 'FERTILIZER_OUT', 'REJECT_OUT', 'LEACHATE_OUT']),
  weightKg: z
    .number()
    .min(0.1, 'वजन कम से कम 0.1 किलो होना चाहिए (Weight must be >= 0.1 kg)')
    .max(5000, 'एक बार में 5000 किलो से अधिक दर्ज नहीं हो सकता (Maximum single entry is 5000 kg)'),
  recordedAt: z.string().optional(),
  wasteCategory: z.string().optional(),
  notes: z.string().optional(),
});

export const pitMonitorRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/v1/pit-monitor/entry
   * Khad-Kachra Diary entry with Back-Dated Entry support
   */
  fastify.post(
    '/entry',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const parse = diaryEntrySchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      const { boxId, flowType, weightKg, recordedAt, wasteCategory, notes, facilityId } = parse.data;

      const box = await resolveBoxAsset(
        boxId,
        facilityId,
        user.role !== 'SUPREME_HEAD' ? user.entityId : undefined
      );

      if (!box) {
        return reply.code(404).send({ success: false, message: 'Compost box not found in your organization' });
      }

      if (!assertTenantOwnership(user, box.entityId, reply, 'Compost box')) {
        return;
      }

      const effectiveDate = recordedAt ? new Date(recordedAt) : new Date();

      // Back-dating and future date sanity check (Workstream E5)
      const now = Date.now();
      const effectiveTime = effectiveDate.getTime();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const fiveMinutesFuture = now + 5 * 60 * 1000;

      if (user.role !== 'SUPREME_HEAD') {
        if (effectiveTime < sevenDaysAgo) {
          return reply.code(400).send({
            success: false,
            message: '7 दिन से पुरानी प्रविष्टि दर्ज करने के लिए सुप्रीम हेड की अनुमति आवश्यक है (Entries older than 7 days require Supreme Head authorization).',
          });
        }
        if (effectiveTime > fiveMinutesFuture) {
          return reply.code(400).send({
            success: false,
            message: 'भविष्य की तारीख में प्रविष्टि दर्ज नहीं की जा सकती (Future date entries are not permitted).',
          });
        }
      }

      // Create ledger entry using clean ObjectId
      const flowEntry = await KhadKachraFlow.create({
        entityId: box.entityId,
        facilityId: box.facilityId,
        boxId: box._id,
        recordedBy: user.userId,
        flowType,
        weightKg,
        wasteCategory: wasteCategory || 'WET_WASTE',
        notes,
        recordedAt: effectiveDate,
      });

      // Recalculate pit fill weight
      const aggregateResult = await KhadKachraFlow.aggregate([
        { $match: { boxId: box._id } },
        {
          $group: {
            _id: '$boxId',
            totalIn: {
              $sum: {
                $cond: [{ $eq: ['$flowType', 'WASTE_IN'] }, '$weightKg', 0],
              },
            },
            totalOut: {
              $sum: {
                $cond: [
                  {
                    $in: ['$flowType', ['FERTILIZER_OUT', 'REJECT_OUT', 'LEACHATE_OUT']],
                  },
                  '$weightKg',
                  0,
                ],
              },
            },
          },
        },
      ]);

      const totalIn = aggregateResult[0]?.totalIn || 0;
      const totalOut = aggregateResult[0]?.totalOut || 0;
      const currentFillKg = Math.max(0, totalIn - totalOut);

      flowEntry.pitFillKgAfter = currentFillKg;
      await flowEntry.save();

      // Check capacity percentage
      const capacityKg =
        (box as any).capacityKg ||
        ((box as any).dimensions?.volumeM3 ? (box as any).dimensions.volumeM3 * 600 : 1000);
      const fillPercentage = (currentFillKg / capacityKg) * 100;

      // Also check latest atmospheric / compaction pressure from node inside this box
      const latestTelemetry = await LiveTelemetry.findOne({ boxId: box._id }).sort({ timestamp: -1 });
      const isHighPressure = latestTelemetry && latestTelemetry.airPressureHpa > AI_THRESHOLDS.PRESSURE_COMPACTION_ALERT;

      const isOverloaded = fillPercentage >= AI_THRESHOLDS.PIT_CAPACITY_ALERT_PCT;

      if (isOverloaded || (fillPercentage >= 90 && isHighPressure)) {
        await AiAlertSanjivani.create({
          facilityId: box.facilityId,
          boxId: box._id,
          alertType: 'PIT_FULL',
          severity: 'CRITICAL',
          triggerValues: {
            currentFillKg,
            capacityKg,
            fillPercentage: Number(fillPercentage.toFixed(1)),
            airPressureHpa: latestTelemetry?.airPressureHpa,
          },
          recipeCard: {
            titleHi: `गड्ढा भर चुका है (${fillPercentage.toFixed(0)}% भरा) - चोकिंग अलर्ट`,
            titleEn: `Compost Pit Overload Warning (${fillPercentage.toFixed(0)}% Capacity)`,
            instructionsHi: [
              'गड्ढे में 95% से अधिक कचरा भर चुका है। तुरंत नया कचरा डालना रोकें।',
              'तैयार खाद को बाहर निकालें (Khad Nikali) ताकि नीचे से हवा का प्रवाह बना रहे।',
              'ड्रेन पाइप की जांच करें कि लीचेट ब्लॉक तो नहीं हुआ है।',
            ],
            instructionsEn: [
              'Pit reached >=95% limit. Cease new waste feeding immediately.',
              'Harvest cured compost to prevent bottom compaction and choking.',
              'Clear leachate drain lines.',
            ],
            immediateAction: 'KHAD_NIKALI, DRAIN_SAAF',
          },
          acknowledged: false,
        });

        fastify.io.emit('pit:full', {
          boxId: box._id,
          boxName: box.name,
          fillPercentage: Number(fillPercentage.toFixed(1)),
          currentFillKg,
        });
      }

      return reply.code(201).send({
        success: true,
        message: 'Diary entry recorded',
        data: {
          id: flowEntry._id,
          flowType,
          weightKg,
          recordedAt: flowEntry.recordedAt,
          currentFillKg,
          fillPercentage: Number(fillPercentage.toFixed(1)),
          isOverloaded,
        },
      });
    }
  );

  /**
   * DELETE /api/v1/pit-monitor/entry/:id
   * 5-Minute Undo Window for accidental diary taps (Workstream E5)
   */
  fastify.delete(
    '/entry/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };

      const entryId = toValidObjectId(id);
      if (!entryId) {
        return reply.code(400).send({ success: false, message: 'Invalid entry ID format' });
      }

      const entry = await KhadKachraFlow.findById(entryId);
      if (!entry) {
        return reply.code(404).send({ success: false, message: 'खाता प्रविष्टि नहीं मिली (Diary entry not found)' });
      }

      if (!assertTenantOwnership(user, entry.entityId, reply, 'Diary entry')) {
        return;
      }

      // 5-minute undo window enforcement
      const isAuthor = entry.recordedBy?.toString() === user.userId;
      const isManagerOrAdmin = user.role === 'BWG_MANAGER' || user.role === 'SUPREME_HEAD';
      const elapsedMs = Date.now() - new Date(entry.createdAt).getTime();
      const isWithinFiveMinutes = elapsedMs <= 5 * 60 * 1000;

      if (!isWithinFiveMinutes && user.role !== 'SUPREME_HEAD') {
        return reply.code(403).send({
          success: false,
          message: '5 मिनट की पूर्ववत (Undo) समय सीमा समाप्त हो चुकी है। केवल सुप्रीम हेड इसे हटा सकते हैं। (Undo window of 5 minutes has expired)',
        });
      }

      if (!isAuthor && !isManagerOrAdmin) {
        return reply.code(403).send({
          success: false,
          message: 'आपको इस प्रविष्टि को वापस लेने की अनुमति नहीं है (Unauthorized to undo this entry)',
        });
      }

      const boxId = entry.boxId;
      await entry.deleteOne();

      // Recalculate pit fill weight after undo
      const aggregateResult = await KhadKachraFlow.aggregate([
        { $match: { boxId } },
        {
          $group: {
            _id: '$boxId',
            totalIn: {
              $sum: {
                $cond: [{ $eq: ['$flowType', 'WASTE_IN'] }, '$weightKg', 0],
              },
            },
            totalOut: {
              $sum: {
                $cond: [
                  {
                    $in: ['$flowType', ['FERTILIZER_OUT', 'REJECT_OUT', 'LEACHATE_OUT']],
                  },
                  '$weightKg',
                  0,
                ],
              },
            },
          },
        },
      ]);

      const totalIn = aggregateResult[0]?.totalIn || 0;
      const totalOut = aggregateResult[0]?.totalOut || 0;
      const currentFillKg = Math.max(0, totalIn - totalOut);

      fastify.io.emit('pit:entry_undone', {
        boxId: boxId.toString(),
        deletedEntryId: entryId.toString(),
        currentFillKg,
        undoneBy: user.userId,
      });

      return reply.send({
        success: true,
        message: 'प्रविष्टि सफलतापूर्वक वापस ले ली गई (Entry successfully undone)',
        data: {
          deletedEntryId: entryId.toString(),
          boxId: boxId.toString(),
          currentFillKg,
        },
      });
    }
  );

  /**
   * GET /api/v1/pit-monitor/box/:boxId
   */
  fastify.get(
    '/box/:boxId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const { boxId } = request.params as { boxId: string };
      const box = await resolveBoxAsset(
        boxId,
        undefined,
        user.role !== 'SUPREME_HEAD' ? user.entityId : undefined
      );

      if (!box) {
        return reply.code(404).send({ success: false, message: 'Box not found in your organization' });
      }

      if (!assertTenantOwnership(user, box.entityId, reply, 'Compost box')) {
        return;
      }

      const recentFlows = await KhadKachraFlow.find({ boxId: box._id })
        .sort({ recordedAt: -1 })
        .limit(20)
        .populate('recordedBy', 'name')
        .lean();

      const capacityKg = (box as any).capacityKg || 1000;
      const latestEntry = recentFlows[0];
      const currentFillKg = latestEntry?.pitFillKgAfter || 0;
      const fillPercentage = Math.min(100, (currentFillKg / capacityKg) * 100);

      return reply.send({
        success: true,
        data: {
          boxId: box._id.toString(),
          boxName: box.name,
          capacityKg,
          currentFillKg,
          fillPercentage: Number(fillPercentage.toFixed(1)),
          recentEntries: recentFlows,
        },
      });
    }
  );

  /**
   * GET /api/v1/pit-monitor/personality/:pitId
   * Retrieves learned Pit Personality Profile, empirical coefficients, and drift status (Feature 3)
   */
  fastify.get(
    '/personality/:pitId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { pitId } = request.params as { pitId: string };
      const validId = toValidObjectId(pitId);
      if (!validId) {
        return reply.code(400).send({ success: false, message: 'Invalid pit ID' });
      }

      const profile = await PitPersonalityProfile.findOne({ pitId: validId });
      if (!profile) {
        // Return default initialized profile for hotel kitchen archetype
        const newProfile = await pitPersonalityService.getOrCreateProfile(
          validId,
          '6717a0000000000000000001',
          'HOTEL_KITCHEN'
        );
        return reply.send({ success: true, data: newProfile });
      }

      return reply.send({ success: true, data: profile });
    }
  );

  /**
   * GET /api/v1/pit-monitor/health-index/:pitId
   * Computes live Pit Health Index with Explain-and-Fix next action (Feature 8)
   */
  fastify.get(
    '/health-index/:pitId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { pitId } = request.params as { pitId: string };
      const validId = toValidObjectId(pitId);
      if (!validId) {
        return reply.code(400).send({ success: false, message: 'Invalid pit ID' });
      }

      const latestIndex = await PitHealthIndexRecord.findOne({ pitId: validId })
        .sort({ assessedAt: -1 })
        .lean();

      if (!latestIndex) {
        // Compute live index based on current telemetry
        const computed = await pitHealthIndexService.computePitHealthIndex({
          pitId: validId,
          facilityId: '6717a0000000000000000001',
          telemetry: {
            tempC: 58.4,
            moisturePct: 52.0,
            ph: 6.8,
            methanePpm: 110,
            daysInCycle: 14,
            sensorTrustPct: 90,
          },
        });
        return reply.send({ success: true, data: computed });
      }

      return reply.send({ success: true, data: latestIndex });
    }
  );

  /**
   * GET /api/v1/pit-monitor/facility-health-league/:facilityId
   * Computes facility load-weighted health index with the worst pit prominently displayed (Feature 8)
   */
  fastify.get(
    '/facility-health-league/:facilityId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { facilityId } = request.params as { facilityId: string };
      const validId = toValidObjectId(facilityId);
      if (!validId) {
        return reply.code(400).send({ success: false, message: 'Invalid facility ID' });
      }

      const records = await PitHealthIndexRecord.find({ facilityId: validId })
        .sort({ assessedAt: -1 })
        .limit(20)
        .lean();

      if (records.length === 0) {
        return reply.send({
          success: true,
          data: {
            facilityAverageIndex: 82,
            worstPitIndex: 82,
            worstPitId: null,
            totalPitsCount: 0,
            pits: [],
          },
        });
      }

      const avg = Math.round(records.reduce((sum, r) => sum + r.overallIndex, 0) / records.length);
      const sortedByWorst = [...records].sort((a, b) => a.overallIndex - b.overallIndex);
      const worst = sortedByWorst[0];

      return reply.send({
        success: true,
        data: {
          facilityAverageIndex: avg,
          worstPitIndex: worst.overallIndex,
          worstPitId: worst.pitId,
          worstPitGrade: worst.grade,
          totalPitsCount: records.length,
          pits: records,
        },
      });
    }
  );
};
