import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { LiveTelemetry } from '../../db/models/LiveTelemetry';
import { resolveNodeAsset } from '../../utils/safe-lookup';
import { aiGateway } from '../../services/ai-gateway.service';
import { runPitCopilot } from '../../services/pit-copilot.service';
import { analyzeCompostImage } from '../../services/vision.service';
import type { JwtPayload } from '../../types';

const chatSchema = z.object({
  message: z.string().min(1),
  role: z.enum(['SUPREME_HEAD', 'BWG_MANAGER', 'SAFAI_MITRA']).optional(),
  context: z
    .object({
      facilityId: z.string().optional(),
      boxId: z.string().optional(),
      nodeId: z.string().optional(),
    })
    .optional(),
  history: z
    .array(
      z.object({
        sender: z.enum(['user', 'assistant']),
        text: z.string(),
      })
    )
    .optional(),
});

const voiceSchema = z.object({
  audioBase64: z.string().min(10),
  mimeType: z.string().default('audio/webm'),
  language: z.enum(['hi', 'en']).default('hi'),
  role: z.enum(['SUPREME_HEAD', 'BWG_MANAGER', 'SAFAI_MITRA']).optional(),
  context: z
    .object({
      facilityId: z.string().optional(),
      boxId: z.string().optional(),
      nodeId: z.string().optional(),
    })
    .optional(),
});

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/v1/ai/chat
   * Text conversational route mediated through centralized server-side AI Gateway
   */
  fastify.post(
    '/chat',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const parse = chatSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      const { message, context, history } = parse.data;
      const effectiveRole = parse.data.role || user.role || 'BWG_MANAGER';

      // 1. Fetch live telemetry context if a node is provided
      let currentTelemetryContext = '';
      if (context?.nodeId) {
        try {
          const node = await resolveNodeAsset(
            context.nodeId,
            user.role !== 'SUPREME_HEAD' ? user.entityId : undefined
          );
          if (node) {
            const telemetry = await LiveTelemetry.findOne({ nodeId: node._id })
              .sort({ timestamp: -1 })
              .lean();
            if (telemetry) {
              currentTelemetryContext = `[Current Live Telemetry for ${node.name}: Temp=${telemetry.tempC}°C, Moisture=${telemetry.moisturePct}%, pH=${telemetry.ph}, Methane=${telemetry.methanePpm} PPM, Pressure=${telemetry.airPressureHpa} hPa]`;
            }
          }
        } catch (e) {
          // ignore telemetry lookup errors
        }
      }

      const response = await aiGateway.generateChatAdvice({
        message,
        role: effectiveRole,
        telemetryContext: currentTelemetryContext,
        history,
      });

      return reply.send({
        success: true,
        ...response,
      });
    }
  );

  /**
   * POST /api/v1/ai/voice
   * Audio speech processing route mediated through server-side AI Gateway
   * Eliminates all client-side Gemini API key exposure.
   */
  fastify.post(
    '/voice',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const parse = voiceSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      const { audioBase64, mimeType, language, context } = parse.data;
      const effectiveRole = parse.data.role || user.role || 'SAFAI_MITRA';

      let currentTelemetryContext = '';
      if (context?.nodeId) {
        try {
          const node = await resolveNodeAsset(
            context.nodeId,
            user.role !== 'SUPREME_HEAD' ? user.entityId : undefined
          );
          if (node) {
            const telemetry = await LiveTelemetry.findOne({ nodeId: node._id })
              .sort({ timestamp: -1 })
              .lean();
            if (telemetry) {
              currentTelemetryContext = `[Current Live Telemetry for ${node.name}: Temp=${telemetry.tempC}°C, Moisture=${telemetry.moisturePct}%, pH=${telemetry.ph}, Methane=${telemetry.methanePpm} PPM]`;
            }
          }
        } catch (e) {
          // ignore telemetry lookup errors
        }
      }

      const response = await aiGateway.processVoiceAudio({
        audioBase64,
        mimeType,
        language,
        role: effectiveRole,
        telemetryContext: currentTelemetryContext,
      });

      return reply.send({
        success: true,
        ...response,
      });
    }
  );

  /**
   * POST /api/v1/ai/copilot
   * Role-Scoped Pit Copilot with Grounded Tool Citations (Workstream J3)
   */
  fastify.post(
    '/copilot',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const parse = chatSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      const { message, context } = parse.data;
      const response = await runPitCopilot(message, user, context);

      return reply.send({
        success: true,
        ...response,
      });
    }
  );

  /**
   * POST /api/v1/ai/vision
   * Computer Vision Analysis for Compost Pits (Workstream K)
   */
  fastify.post(
    '/vision',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = request.body as any;
      if (!body.imageBase64 && !body.imageUrl) {
        return reply.code(400).send({
          success: false,
          message: 'Must provide imageBase64 or imageUrl for vision analysis',
        });
      }

      const analysis = await analyzeCompostImage({
        imageBase64: body.imageBase64,
        imageUrl: body.imageUrl,
        mimeType: body.mimeType,
        facilityId: body.facilityId,
        pitId: body.pitId,
      });

      return reply.send({
        success: true,
        data: analysis,
      });
    }
  );
};
