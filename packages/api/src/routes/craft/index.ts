import { FastifyPluginAsync } from 'fastify';
import { equipmentRegisterService } from '../../services/equipment-register.service.js';
import { nodeCareService } from '../../services/node-care.service.js';
import { dataCorrectionService } from '../../services/data-correction.service.js';
import { siteMapService } from '../../services/site-map.service.js';
import { senseCheckService } from '../../services/sense-check.service.js';
import { paratPlannerService } from '../../services/parat-planner.service.js';
import { waterDosingService } from '../../services/water-dosing.service.js';
import { palatnaCoachService } from '../../services/palatna-coach.service.js';
import { wasteAgeService } from '../../services/waste-age.service.js';
import { dayCloseService } from '../../services/day-close.service.js';
import { sopStudioService } from '../../services/sop-studio.service.js';
import { finishingLineService } from '../../services/finishing-line.service.js';
import { massBalanceService } from '../../services/mass-balance.service.js';
import { labGradingService } from '../../services/lab-grading.service.js';
import { formulatorService } from '../../services/formulator.service.js';
import { offtakePlannerService } from '../../services/offtake-planner.service.js';
import { leachateLoopService } from '../../services/leachate-loop.service.js';
import { pestControlService } from '../../services/pest-control.service.js';
import { ergonomicGuardService } from '../../services/ergonomic-guard.service.js';
import { reportStudioService } from '../../services/report-studio.service.js';

export const craftRoutes: FastifyPluginAsync = async (fastify) => {
  // Feature 15: Scale Calibration Check Gate
  fastify.post('/scale-check', async (request, reply) => {
    const body = request.body as any;
    const result = equipmentRegisterService.evaluateScaleCheck(body);
    return reply.send({ success: true, result });
  });

  // Feature 22: Node Care Light Maintenance
  fastify.post('/care-round', async (request, reply) => {
    const body = request.body as any;
    const result = nodeCareService.evaluateCareRound(body);
    return reply.send({ success: true, result });
  });

  // Feature 18: Correction Requests (Maker)
  fastify.post('/correction-request', async (request, reply) => {
    const body = request.body as any;
    const result = dataCorrectionService.createCorrectionProposal(body);
    return reply.send({ success: true, result });
  });

  // Feature 14: Site Map Buffer Check
  fastify.post('/site-map/buffer-check', async (request, reply) => {
    const body = request.body as any;
    const alerts = siteMapService.evaluateBufferZones(body.zones, body.nodes);
    return reply.send({ success: true, alerts });
  });

  // Feature 2: Sense Check
  fastify.post('/sense-check', async (request, reply) => {
    const body = request.body as any;
    const result = senseCheckService.evaluateSenseCheck(body);
    return reply.send({ success: true, result });
  });

  // Feature 3: Parat Recipe
  fastify.post('/parat-recipe', async (request, reply) => {
    const body = request.body as any;
    const result = paratPlannerService.calculateMixRecipe(body.layers);
    return reply.send({ success: true, result });
  });

  // Feature 5: Water Dosing Assistant
  fastify.post('/water-dosing', async (request, reply) => {
    const body = request.body as any;
    const plan = waterDosingService.calculateWaterDosing(body);
    return reply.send({ success: true, plan });
  });

  // Feature 1: Palatna Coach
  fastify.post('/palatna-coach', async (request, reply) => {
    const body = request.body as any;
    const result = palatnaCoachService.evaluateTurningQuality(body);
    return reply.send({ success: true, result });
  });

  // Feature 4: Waste Age Clock
  fastify.post('/waste-age', async (request, reply) => {
    const body = request.body as any;
    const result = wasteAgeService.evaluateWasteAge({
      generatedAt: new Date(body.generatedAt),
      loadedAt: new Date(body.loadedAt),
      wasteMassKg: body.wasteMassKg,
    });
    return reply.send({ success: true, result });
  });

  // Feature 17: Day Close Review
  fastify.post('/day-close/evaluate', async (request, reply) => {
    const body = request.body as any;
    const result = dayCloseService.evaluateDayClose(body.checklist);
    return reply.send({ success: true, result });
  });

  // Feature 16: SOP Adherence
  fastify.post('/sop/evaluate-adherence', async (request, reply) => {
    const body = request.body as any;
    const result = sopStudioService.evaluateAdherence(body);
    return reply.send({ success: true, result });
  });

  // Feature 9: Screening Yield
  fastify.post('/screening-yield', async (request, reply) => {
    const body = request.body as any;
    const result = finishingLineService.calculateScreeningYield(body);
    return reply.send({ success: true, result });
  });

  // Feature 10: Mass Balance Reconciliation
  fastify.post('/mass-balance/reconcile', async (request, reply) => {
    const body = request.body as any;
    const result = massBalanceService.reconcileMassFlow(body);
    return reply.send({ success: true, result });
  });

  // Feature 11: Lab FCO 1985 Grading
  fastify.post('/lab-grading', async (request, reply) => {
    const body = request.body as any;
    const result = labGradingService.gradeCompostReport(body);
    return reply.send({ success: true, result });
  });

  // Feature 12: Formulator Costing
  fastify.post('/formulator/costing', async (request, reply) => {
    const body = request.body as any;
    const result = formulatorService.calculateFormulaCosting(body);
    return reply.send({ success: true, result });
  });

  // Feature 13: Offtake Schedule
  fastify.post('/offtake/evaluate', async (request, reply) => {
    const body = request.body as any;
    const result = offtakePlannerService.evaluateOfftakeSchedule(body);
    return reply.send({ success: true, result });
  });

  // Feature 6: Leachate Loop
  fastify.post('/leachate/evaluate-recirculation', async (request, reply) => {
    const body = request.body as any;
    const result = leachateLoopService.evaluateRecirculationRule(body);
    return reply.send({ success: true, result });
  });

  // Feature 7: Pest Control
  fastify.post('/pest/evaluate-pressure', async (request, reply) => {
    const body = request.body as any;
    const result = pestControlService.evaluatePestPressure(body);
    return reply.send({ success: true, result });
  });

  // Feature 8: Ergonomic Welfare
  fastify.post('/ergonomic/evaluate-shift', async (request, reply) => {
    const body = request.body as any;
    const result = ergonomicGuardService.evaluateShiftWelfare(body);
    return reply.send({ success: true, result });
  });

  // Feature 23: Metric Dictionary
  fastify.get('/metrics/dictionary', async () => {
    return {
      success: true,
      metrics: reportStudioService.getStandardMetrics(),
    };
  });
};
