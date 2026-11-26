import type { FastifyPluginAsync } from 'fastify';
import { pitPassportService } from '../../services/pit-passport.service';

export const passportRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /passport/:pitId
   * PUBLIC endpoint for QR code plate scanning on physical compost boxes (Feature 5).
   * No authentication required. Strictly displays non-PII, time-stamped proof of process integrity.
   */
  fastify.get('/:pitId', async (request, reply) => {
    const { pitId } = request.params as { pitId: string };

    if (!pitId || pitId.trim().length === 0) {
      return reply.code(400).send({
        success: false,
        error: 'Pit identifier or asset code is required.',
      });
    }

    try {
      const passport = await pitPassportService.getPublicPitPassport(pitId.trim());
      return reply.code(200).send({
        success: true,
        data: passport,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error retrieving pit passport';
      return reply.code(404).send({
        success: false,
        error: msg,
      });
    }
  });
};
