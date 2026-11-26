import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { AuthorityMatrixService } from '../../services/authority-matrix.service';
import { MediaVaultService } from '../../services/media-vault.service';
import { IntegrationHubService } from '../../services/integration-hub.service';
import { ActuatorGatewayService } from '../../services/actuator-gateway.service';
import { PrintSignageService } from '../../services/print-signage.service';
import { DeviceAppHealthService } from '../../services/device-app-health.service';
import { PathwayRouterService } from '../../services/pathway-router.service';
import { SourceReductionService } from '../../services/source-reduction.service';
import { WasteAuditService } from '../../services/waste-audit.service';
import { HygieneZoningService } from '../../services/hygiene-zoning.service';
import { FencelineOdorService } from '../../services/fenceline-odor.service';
import { BuyerAdvisorService } from '../../services/buyer-advisor.service';
import { FieldProofService } from '../../services/field-proof.service';
import { ComplaintRecallService } from '../../services/complaint-recall.service';
import { PracticePitService } from '../../services/practice-pit.service';
import { ShiftHuddleService } from '../../services/shift-huddle.service';
import { OperatingRhythmService } from '../../services/operating-rhythm.service';
import { FracasReliabilityService } from '../../services/fracas-reliability.service';
import { PlanningBoardService } from '../../services/planning-board.service';
import { YardPerformanceService } from '../../services/yard-performance.service';
import { FinanceProcurementService } from '../../services/finance-procurement.service';
import { WorkforceCockpitService } from '../../services/workforce-cockpit.service';
import { StakeholderExperienceService } from '../../services/stakeholder-experience.service';
import { GrowthExpansionService } from '../../services/growth-expansion.service';

export const vol5Routes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const authorityService = new AuthorityMatrixService();
  const mediaVaultService = new MediaVaultService();
  const integrationHubService = new IntegrationHubService();
  const actuatorGatewayService = new ActuatorGatewayService();
  const printSignageService = new PrintSignageService();
  const deviceHealthService = new DeviceAppHealthService();
  const pathwayRouterService = new PathwayRouterService();
  const sourceReductionService = new SourceReductionService();
  const wasteAuditService = new WasteAuditService();
  const hygieneZoningService = new HygieneZoningService();
  const fencelineOdorService = new FencelineOdorService();
  const buyerAdvisorService = new BuyerAdvisorService();
  const fieldProofService = new FieldProofService();
  const complaintRecallService = new ComplaintRecallService();
  const practicePitService = new PracticePitService();
  const shiftHuddleService = new ShiftHuddleService();
  const operatingRhythmService = new OperatingRhythmService();
  const fracasService = new FracasReliabilityService();
  const planningBoardService = new PlanningBoardService();
  const yardPerformanceService = new YardPerformanceService();
  const financeProcurementService = new FinanceProcurementService();
  const workforceCockpitService = new WorkforceCockpitService();
  const stakeholderExpService = new StakeholderExperienceService();
  const growthExpansionService = new GrowthExpansionService();

  // Part A: Shared Services (F1 - F6)
  fastify.post('/authority/requests', async (request, reply) => {
    const body = request.body as any;
    const req = authorityService.createApprovalRequest(body);
    return reply.status(201).send(req);
  });

  fastify.post('/authority/signoff', async (request, reply) => {
    const body = request.body as any;
    const res = authorityService.signOff(body);
    return reply.send(res);
  });

  fastify.post('/authority/breakglass', async (request, reply) => {
    const body = request.body as any;
    const req = authorityService.breakGlass(body);
    return reply.send(req);
  });

  fastify.get('/authority/bottlenecks', async (request, reply) => {
    const query = request.query as any;
    const summary = authorityService.getBottleneckSummary(query.tenantId || 'DEFAULT');
    return reply.send(summary);
  });

  fastify.post('/media/upload', async (request, reply) => {
    const body = request.body as any;
    const res = mediaVaultService.uploadMedia(body);
    return reply.status(201).send(res);
  });

  fastify.post('/media/redact', async (request, reply) => {
    const body = request.body as any;
    const job = mediaVaultService.performRedaction(body);
    return reply.send(job);
  });

  fastify.post('/media/legal-hold', async (request, reply) => {
    const body = request.body as any;
    const hold = mediaVaultService.applyLegalHold(body);
    return reply.send(hold);
  });

  fastify.delete('/media/subject/:userId', async (request, reply) => {
    const params = request.params as any;
    const result = mediaVaultService.fulfillDataSubjectDeletion(params.userId);
    return reply.send(result);
  });

  fastify.post('/integration/stage-import', async (request, reply) => {
    const body = request.body as any;
    const result = integrationHubService.executeStagedImport(body);
    return reply.send(result);
  });

  fastify.post('/actuators/mode-transition', async (request, reply) => {
    const body = request.body as any;
    const result = actuatorGatewayService.transitionMode(body);
    return reply.send(result);
  });

  fastify.post('/actuators/command', async (request, reply) => {
    const body = request.body as any;
    const cmd = actuatorGatewayService.dispatchCommand(body);
    return reply.send(cmd);
  });

  fastify.post('/actuators/confirm', async (request, reply) => {
    const body = request.body as any;
    const cmd = actuatorGatewayService.confirmCommandExecution(body);
    return reply.send(cmd);
  });

  fastify.post('/signage/print-jobs', async (request, reply) => {
    const body = request.body as any;
    const job = printSignageService.createPrintJob(body);
    return reply.status(201).send(job);
  });

  fastify.get('/signage/validate-qr', async (request, reply) => {
    const query = request.query as any;
    const result = printSignageService.validateQrScan(query.qrString);
    return reply.send(result);
  });

  fastify.post('/devices/heartbeat', async (request, reply) => {
    const body = request.body as any;
    const res = deviceHealthService.recordHeartbeat(body);
    return reply.send(res);
  });

  // Part B: Craft & Operations (F7 - F18)
  fastify.post('/routing/route-container', async (request, reply) => {
    const body = request.body as any;
    const dec = pathwayRouterService.routeContainer(body);
    return reply.send(dec);
  });

  fastify.post('/routing/consignments', async (request, reply) => {
    const body = request.body as any;
    const c = pathwayRouterService.createConsignment(body);
    return reply.status(201).send(c);
  });

  fastify.post('/source-reduction/tag', async (request, reply) => {
    const body = request.body as any;
    const tag = sourceReductionService.tagBin(body);
    return reply.status(201).send(tag);
  });

  fastify.get('/source-reduction/outlet-scorecard', async (request, reply) => {
    const query = request.query as any;
    const card = sourceReductionService.computeOutletScorecard(query);
    return reply.send(card);
  });

  fastify.post('/audits/sample', async (request, reply) => {
    const body = request.body as any;
    const res = wasteAuditService.recordSample(body);
    return reply.status(201).send(res);
  });

  fastify.post('/hygiene/breach', async (request, reply) => {
    const body = request.body as any;
    const res = hygieneZoningService.reportCrossZoneBreach(body);
    return reply.send(res);
  });

  fastify.post('/fenceline/wind-check', async (request, reply) => {
    const body = request.body as any;
    const res = fencelineOdorService.evaluateTurningWindRisk(body);
    return reply.send(res);
  });

  fastify.post('/advisor/guidance', async (request, reply) => {
    const body = request.body as any;
    const g = buyerAdvisorService.evaluateGuidance(body);
    return reply.send(g);
  });

  fastify.post('/field-proof/trials', async (request, reply) => {
    const body = request.body as any;
    const t = fieldProofService.startTrial(body);
    return reply.status(201).send(t);
  });

  fastify.post('/complaints/register', async (request, reply) => {
    const body = request.body as any;
    const res = complaintRecallService.registerComplaint(body);
    return reply.status(201).send(res);
  });

  fastify.post('/practice-pit/run', async (request, reply) => {
    const body = request.body as any;
    const run = practicePitService.executeSimRun(body);
    return reply.send(run);
  });

  fastify.post('/huddle/generate', async (request, reply) => {
    const body = request.body as any;
    const brief = shiftHuddleService.generateBrief(body);
    return reply.send(brief);
  });

  fastify.post('/rhythm/meeting', async (request, reply) => {
    const body = request.body as any;
    const mtg = operatingRhythmService.conductMeeting(body);
    return reply.status(201).send(mtg);
  });

  fastify.post('/fracas/log-failure', async (request, reply) => {
    const body = request.body as any;
    const report = fracasService.logFailure(body);
    return reply.status(201).send(report);
  });

  // Part C: Leadership Dashboards (F19 - F24)
  fastify.post('/dashboards/planning-board', async (request, reply) => {
    const body = request.body as any;
    const view = planningBoardService.computeBoardView(body);
    return reply.send(view);
  });

  fastify.post('/dashboards/yard-performance', async (request, reply) => {
    const body = request.body as any;
    const view = yardPerformanceService.computeYardPerformance(body);
    return reply.send(view);
  });

  fastify.post('/dashboards/finance-procurement', async (request, reply) => {
    const body = request.body as any;
    const view = financeProcurementService.computeFinanceView(body);
    return reply.send(view);
  });

  fastify.post('/dashboards/workforce', async (request, reply) => {
    const body = request.body as any;
    const view = workforceCockpitService.computeWorkforceView(body);
    return reply.send(view);
  });

  fastify.post('/dashboards/stakeholder-experience', async (request, reply) => {
    const body = request.body as any;
    const view = stakeholderExpService.computeExperienceView(body);
    return reply.send(view);
  });

  fastify.post('/dashboards/growth-expansion', async (request, reply) => {
    const body = request.body as any;
    const view = growthExpansionService.computeGrowthView(body);
    return reply.send(view);
  });
};
