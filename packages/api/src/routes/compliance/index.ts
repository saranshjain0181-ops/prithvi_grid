import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { complianceService } from '../../services/compliance.service';
import { generateSwmCompliancePdf } from '../../services/pdf.service';
import { merkleSealService, verifyInclusionProof, hashCanonicalRecord } from '../../services/merkle-seal.service';
import { DailySealLedger } from '../../db/models/DailySealLedger';
import { SwmComplianceArchive } from '../../db/models/SwmComplianceArchive';


import { FacilityLocation } from '../../db/models/FacilityLocation';
import { GlobalEntity } from '../../db/models/GlobalEntity';
import { LabourExecutionLedger } from '../../db/models/LabourExecutionLedger';
import { resolveFacility, toValidObjectId } from '../../utils/safe-lookup';
import { assertTenantOwnership, buildTenantQuery } from '../../middleware/tenant-guard';
import { env } from '../../config/env';
import type { JwtPayload } from '../../types';

const generateAuditSchema = z.object({
  facilityId: z.string().min(1),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  reportingPeriod: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL']).default('MONTHLY'),
  fineSlabInr: z.number().min(0).max(100000).optional(),
  compostPricePerKg: z.number().min(0).max(100).optional(),
  tippingFeePerMt: z.number().min(0).max(10000).optional(),
});

const auditorTokenSchema = z.object({
  facilityId: z.string().min(1),
  expiresInHours: z.number().min(1).max(168).default(24),
  auditorName: z.string().optional(),
  auditorAgency: z.string().optional(),
});

export const complianceRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/compliance/verify/:hashOrId
   * PUBLIC endpoint for Municipal Sanitary Inspectors (IMC)
   * Scans QR code on PDF to verify cryptographic authenticity without logging in (Workstream F6)
   */
  fastify.get('/verify/:hashOrId', async (request, reply) => {
    const { hashOrId } = request.params as { hashOrId: string };
    if (!hashOrId || hashOrId.length < 4) {
      return reply.code(400).send({ success: false, message: 'Invalid certificate hash or ID' });
    }

    const result = await complianceService.verifyCertificate(hashOrId);
    if (!result.isValid) {
      return reply.code(404).send({
        success: false,
        verified: false,
        message: result.message,
        verifiedAt: result.verifiedAt,
      });
    }

    return reply.send({
      success: true,
      verified: true,
      data: result,
    });
  });

  /**
   * POST /api/v1/compliance/generate
   * Generates a tamper-evident SWM-2026 Audit Certificate derived from real telemetry
   */
  fastify.post(
    '/generate',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const parse = generateAuditSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      const { facilityId, reportingPeriod, fineSlabInr, compostPricePerKg, tippingFeePerMt } = parse.data;

      const facility = await resolveFacility(
        facilityId,
        user.role !== 'SUPREME_HEAD' ? user.entityId : undefined
      );

      if (!facility) {
        return reply.code(404).send({ success: false, message: 'Facility not found in your organization' });
      }

      if (!assertTenantOwnership(user, facility.entityId, reply, 'Facility location')) {
        return;
      }

      const now = new Date();
      const periodEnd = parse.data.periodEnd ? new Date(parse.data.periodEnd) : now;
      let periodStart = parse.data.periodStart ? new Date(parse.data.periodStart) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const certificate = await complianceService.generateComplianceAudit({
        facilityId: facility._id,
        entityId: facility.entityId,
        periodStart,
        periodEnd,
        reportingPeriod,
        generatedBy: user.userId,
        fineSlabInr,
        compostPricePerKg,
        tippingFeePerMt,
      });

      return reply.code(201).send({
        success: true,
        message: 'SWM-2026 Compliance Certificate successfully generated and cryptographically sealed.',
        data: certificate,
      });
    }
  );

  /**
   * GET /api/v1/compliance/archive
   * Server-Side Paginated list of Compliance Records
   */
  fastify.get('/archive', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as JwtPayload;
    const query = request.query as any;

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const filter: Record<string, any> = buildTenantQuery(user, {});

    if (query.facilityId) {
      const validFacId = toValidObjectId(query.facilityId);
      if (validFacId) filter.facilityId = validFacId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    const [records, total] = await Promise.all([
      SwmComplianceArchive.find(filter)
        .sort({ periodStart: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('facilityId', 'name facilityName imcZone')
        .populate('entityId', 'orgName swmRegNo')
        .lean(),
      SwmComplianceArchive.countDocuments(filter),
    ]);

    return reply.send({
      success: true,
      data: records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  });

  /**
   * GET /api/v1/compliance/:id/pdf & GET /api/v1/compliance/download-pdf/:id
   * Streams tamper-evident PDF certificate
   */
  const streamCertificatePdf = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };

    const validId = toValidObjectId(id);
    const cert = await SwmComplianceArchive.findOne(
      validId ? { _id: validId } : { certificateId: id }
    )
      .populate('entityId', 'orgName swmRegNo imcZone imcWard')
      .populate('facilityId', 'name facilityName imcZone')
      .lean();

    if (!cert) {
      return reply.code(404).send({ success: false, message: 'Compliance certificate not found' });
    }

    const entity = cert.entityId as any;
    const facility = cert.facilityId as any;

    const pdfBuffer = await generateSwmCompliancePdf({
      certificateId: cert.certificateId,
      certificateHash: cert.certificateHash,
      previousCertificateHash: cert.previousCertificateHash,
      entityName: entity?.orgName || 'Indore Bulk Waste Generator',
      facilityName: facility?.facilityName || facility?.name || 'Central Compost Yard',
      swmRegNo: entity?.swmRegNo || `SWM-IND-2026-${cert.certificateId.slice(-4)}`,
      imcZone: entity?.imcZone || facility?.imcZone || 'Zone 1 (Palasia / Central)',
      imcWard: entity?.imcWard || 'Ward 12',
      auditPeriod: `${new Date(cert.periodStart).toLocaleDateString('en-IN')} - ${new Date(cert.periodEnd).toLocaleDateString('en-IN')}`,
      totalWasteProcessedKg: cert.summary?.totalWasteInKg || 0,
      totalCompostYieldKg: cert.summary?.totalFertilizerOutKg || 0,
      finesPreventedInr: cert.financialEstimates?.finesPreventedInr || 0,
      violationsPrevented: cert.summary?.violationsPrevented || 0,
      carbonOffsetKg: cert.financialEstimates?.carbonOffsetKg || 0,
      generatedDate: new Date(cert.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      thermophilicHours: cert.summary?.thermophilicHours,
      avgTempC: cert.summary?.avgTempC,
      avgMoisturePct: cert.summary?.avgMoisturePct,
      maxMethanePpm: cert.summary?.maxMethanePpm,
      verifiedLabourSessions: cert.summary?.labourVerifiedGenuine,
      requirements: cert.requirementsCatalog as any,
    });

    reply.header('Content-Type', 'application/pdf');
    reply.header(
      'Content-Disposition',
      `attachment; filename="SWM-2026-Audit-Certificate-${cert.certificateId}.pdf"`
    );
    return reply.send(pdfBuffer);
  };

  fastify.get('/:id/pdf', { preHandler: [fastify.authenticate] }, streamCertificatePdf);
  fastify.get('/download-pdf/:id', { preHandler: [fastify.authenticate] }, streamCertificatePdf);

  /**
   * POST /api/v1/compliance/auditor-token
   * Generates a time-limited read-only inspection token for municipal sanitary inspectors (Workstream N2)
   */
  fastify.post(
    '/auditor-token',
    { preHandler: [fastify.authenticate, fastify.requireRole('BWG_MANAGER')] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const parse = auditorTokenSchema.safeParse(request.body);

      if (!parse.success) {
        return reply.code(400).send({
          success: false,
          error: 'ValidationError',
          message: parse.error.errors[0]?.message,
        });
      }

      const { facilityId, expiresInHours, auditorName, auditorAgency } = parse.data;
      const facility = await resolveFacility(
        facilityId,
        user.role !== 'SUPREME_HEAD' ? user.entityId : undefined
      );

      if (!facility) {
        return reply.code(404).send({ success: false, message: 'Facility not found' });
      }

      if (!assertTenantOwnership(user, facility.entityId, reply, 'Facility location')) {
        return;
      }

      const payload = {
        userId: 'auditor_' + Date.now(),
        role: 'AUDITOR_GUEST',
        entityId: facility.entityId.toString(),
        facilityId: facility._id.toString(),
        auditorName: auditorName || 'IMC Municipal Inspector',
        auditorAgency: auditorAgency || 'Indore Municipal Corporation (IMC)',
      };

      const token = jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: `${expiresInHours}h`,
      });

      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
      const shareableUrl = `http://localhost:5173/auditor-inspect?token=${token}`;

      return reply.send({
        success: true,
        message: `Auditor Inspection link generated (valid for ${expiresInHours} hours)`,
        data: {
          token,
          shareableUrl,
          expiresAt: expiresAt.toISOString(),
          facilityId: facility._id.toString(),
          facilityName: facility.name,
        },
      });
    }
  );

  /**
   * GET /api/v1/compliance/auditor-inspect
   * Read-only inspection dashboard data bundle for auditor tokens (Workstream N2)
   */
  fastify.get(
    '/auditor-inspect',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.user as any;
      const facilityId = user.facilityId;

      if (!facilityId) {
        return reply.code(400).send({ success: false, message: 'Auditor token not bound to a facility' });
      }

      const [facility, latestCertificates, recentLedger] = await Promise.all([
        FacilityLocation.findById(facilityId).populate('entityId', 'orgName swmRegNo imcZone imcWard').lean(),
        SwmComplianceArchive.find({ facilityId })
          .sort({ periodStart: -1 })
          .limit(10)
          .lean(),
        LabourExecutionLedger.find({ facilityId })
          .sort({ taskTimestamp: -1 })
          .limit(20)
          .lean(),
      ]);

      if (!facility) {
        return reply.code(404).send({ success: false, message: 'Facility not found' });
      }

      return reply.send({
        success: true,
        data: {
          facility,
          auditor: {
            name: user.auditorName || 'Official Municipal Auditor',
            agency: user.auditorAgency || 'Indore Municipal Corporation (IMC)',
            mode: 'READ_ONLY_INSPECTION_MODE',
            expiresAt: user.exp ? new Date(user.exp * 1000).toISOString() : undefined,
          },
          certificates: latestCertificates,
          recentLaborLedger: recentLedger,
        },
      });
    }
  );

  /**
   * POST /api/v1/compliance/verify-record-inclusion
   * Verifies whether a specific telemetry or labour claim is mathematically sealed in a daily Merkle root (Feature 5)
   */
  fastify.post('/verify-record-inclusion', async (request, reply) => {
    const body = request.body as {
      leafHash?: string;
      rawPayload?: Record<string, unknown>;
      merkleRoot: string;
      proof: Array<{ position: 'left' | 'right'; hash: string }>;
    };

    if (!body || !body.merkleRoot || !body.proof) {
      return reply.code(400).send({
        success: false,
        error: 'merkleRoot and proof array are required.',
      });
    }

    const targetHash = body.leafHash || (body.rawPayload ? hashCanonicalRecord(body.rawPayload) : undefined);
    if (!targetHash) {
      return reply.code(400).send({
        success: false,
        error: 'Either leafHash or rawPayload must be provided.',
      });
    }

    const isValid = verifyInclusionProof({
      leafHash: targetHash,
      merkleRoot: body.merkleRoot,
      proof: body.proof,
    });

    return reply.code(200).send({
      success: true,
      data: {
        isIncluded: isValid,
        targetHash,
        merkleRoot: body.merkleRoot,
        proofLength: body.proof.length,
        verifiedAt: new Date().toISOString(),
      },
    });
  });

  /**
   * GET /api/v1/compliance/daily-seals/:facilityId
   * Retrieves chained daily seals for a given facility location
   */
  fastify.get('/daily-seals/:facilityId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { facilityId } = request.params as { facilityId: string };
    const seals = await DailySealLedger.find({ facilityId })
      .sort({ sealDate: -1 })
      .limit(60)
      .lean();

    return reply.code(200).send({
      success: true,
      data: seals,
    });
  });

  /**
   * POST /api/v1/compliance/daily-seals/amend
   * Records a non-destructive post-seal amendment when manager overrides a record
   */
  fastify.post('/daily-seals/amend', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as JwtPayload;
    const body = request.body as {
      facilityId: string;
      sealDate: string;
      reason: string;
      overrideRecordId: string;
      previousLeafHash: string;
      newPayload: Record<string, unknown>;
    };

    if (!body.facilityId || !body.sealDate || !body.reason || !body.newPayload) {
      return reply.code(400).send({
        success: false,
        error: 'facilityId, sealDate, reason, and newPayload are required.',
      });
    }

    const tenantId = user.entityId || '671500000000000000000001';
    const updatedSeal = await merkleSealService.recordPostSealAmendment({
      tenantId,
      facilityId: body.facilityId,
      sealDate: body.sealDate,
      amendedBy: user.userId,
      reason: body.reason,
      overrideRecordId: body.overrideRecordId,
      previousLeafHash: body.previousLeafHash,
      newPayload: body.newPayload,
    });

    return reply.code(200).send({
      success: true,
      data: updatedSeal,
      message: 'Post-seal amendment recorded non-destructively. Historical record preserved.',
    });
  });
};
