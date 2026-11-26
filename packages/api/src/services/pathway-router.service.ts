import {
  ExternalProcessor,
  RoutingDecision,
  Consignment,
  WastePathway,
} from '../db/models/PathwayRouter';

export class PathwayRouterService {
  private processors: Map<string, ExternalProcessor> = new Map();
  private decisions: Map<string, RoutingDecision> = new Map();
  private consignments: Map<string, Consignment> = new Map();

  public registerExternalProcessor(processor: ExternalProcessor): void {
    this.processors.set(processor.processorId, processor);
  }

  public routeContainer(params: {
    containerId: string;
    streamType: string;
    massKg: number;
    hasBiomedicalHazard: boolean;
    onSitePitAvailableCapacityKg: number;
    isFatOrOilHeavy?: boolean;
    isPreCompostedCured?: boolean;
    overridePathway?: WastePathway;
    overrideReason?: string;
  }): RoutingDecision {
    const decisionId = `ROUTE-${Date.now()}`;
    const reasons: string[] = [];
    let recommendedPathway: WastePathway = 'HOT_COMPOST_PIT';
    let targetEntityId: string | undefined;

    // Safety Interlock 1: Biomedical waste is NEVER routed to compost or general processors
    if (params.hasBiomedicalHazard) {
      recommendedPathway = 'REJECT';
      reasons.push(
        'CRITICAL: Biomedical or infectious waste detected. Immediate containment and incident report triggered [LEGAL-REVIEW]'
      );
      const decision: RoutingDecision = {
        decisionId,
        containerId: params.containerId,
        streamType: params.streamType,
        massKg: params.massKg,
        recommendedPathway,
        reasons,
        isOverridden: false,
        chosenPathway: 'REJECT',
        timestamp: new Date().toISOString(),
      };
      this.decisions.set(decisionId, decision);
      return decision;
    }

    // Pathway logic: Vermicompost feed if already pre-composted & cool
    if (params.isPreCompostedCured) {
      recommendedPathway = 'VERMICOMPOST_FEED';
      reasons.push('Material is pre-composted and within safe vermicompost temperature bounds');
    }
    // High-fat or on-site capacity shortage -> external processor
    else if (params.isFatOrOilHeavy || params.massKg > params.onSitePitAvailableCapacityKg) {
      const activeProcessor = Array.from(this.processors.values()).find(
        (p) => p.isActive && p.acceptedStreams.includes(params.streamType)
      );

      if (activeProcessor) {
        recommendedPathway = 'EXTERNAL_PROCESSOR';
        targetEntityId = activeProcessor.processorId;
        reasons.push(
          params.isFatOrOilHeavy
            ? 'High-fat content exceeds on-site aeration threshold; routed to licensed external processor'
            : `On-site pit capacity (${params.onSitePitAvailableCapacityKg}kg) exceeded by intake (${params.massKg}kg)`
        );
      } else {
        recommendedPathway = 'COOL_HOLDING_AREA';
        reasons.push('On-site capacity tight; placed in temporary cool holding bay');
      }
    } else {
      recommendedPathway = 'HOT_COMPOST_PIT';
      reasons.push('On-site pit capacity available; standard thermophilic decomposition pathway');
    }

    const chosenPathway = params.overridePathway || recommendedPathway;
    const isOverridden = !!params.overridePathway && params.overridePathway !== recommendedPathway;

    const decision: RoutingDecision = {
      decisionId,
      containerId: params.containerId,
      streamType: params.streamType,
      massKg: params.massKg,
      recommendedPathway,
      targetEntityId,
      reasons,
      isOverridden,
      chosenPathway,
      overrideReason: isOverridden ? params.overrideReason : undefined,
      timestamp: new Date().toISOString(),
    };

    this.decisions.set(decisionId, decision);
    return decision;
  }

  public createConsignment(params: {
    externalProcessorId: string;
    containerIds: string[];
    streamType: string;
    sentWeightKg: number;
    vehicleNumber: string;
    manifestDocRef: string;
  }): Consignment {
    const processor = this.processors.get(params.externalProcessorId);
    if (!processor || !processor.isActive) {
      throw new Error(`Active external processor ${params.externalProcessorId} not found`);
    }

    // Check licence expiry [LEGAL-REVIEW]
    if (new Date(processor.licenseExpiresAt).getTime() < Date.now()) {
      throw new Error(`External processor licence expired on ${processor.licenseExpiresAt}`);
    }

    const consignmentId = `CONSIGN-${Date.now()}`;
    const consignment: Consignment = {
      consignmentId,
      externalProcessorId: params.externalProcessorId,
      containerIds: params.containerIds,
      streamType: params.streamType,
      sentWeightKg: params.sentWeightKg,
      vehicleNumber: params.vehicleNumber,
      manifestDocRef: params.manifestDocRef,
      createdAt: new Date().toISOString(),
      discrepancyFlagged: false,
      status: 'DISPATCHED',
    };

    this.consignments.set(consignmentId, consignment);
    return consignment;
  }

  public confirmConsignmentReceipt(params: {
    consignmentId: string;
    receivedWeightKg: number;
  }): Consignment {
    const consignment = this.consignments.get(params.consignmentId);
    if (!consignment) throw new Error(`Consignment ${params.consignmentId} not found`);

    consignment.receivedWeightKg = params.receivedWeightKg;
    consignment.discrepancyKg = Math.abs(consignment.sentWeightKg - params.receivedWeightKg);
    consignment.confirmedAt = new Date().toISOString();

    // > 3% discrepancy triggers audit alert
    const discrepancyPct = (consignment.discrepancyKg / consignment.sentWeightKg) * 100;
    if (discrepancyPct > 3.0) {
      consignment.discrepancyFlagged = true;
      consignment.status = 'DISCREPANCY_FLAGGED';
    } else {
      consignment.discrepancyFlagged = false;
      consignment.status = 'CONFIRMED';
    }

    return consignment;
  }

  public getMassBalanceDiversion(facilityId: string) {
    const decisions = Array.from(this.decisions.values());
    const onSiteKg = decisions
      .filter((d) => d.chosenPathway === 'HOT_COMPOST_PIT' || d.chosenPathway === 'VERMICOMPOST_FEED')
      .reduce((acc, d) => acc + d.massKg, 0);

    const offSiteKg = Array.from(this.consignments.values())
      .filter((c) => c.status === 'CONFIRMED' || c.status === 'DISCREPANCY_FLAGGED')
      .reduce((acc, c) => acc + (c.receivedWeightKg || c.sentWeightKg), 0);

    return {
      facilityId,
      totalWasteHandledKg: onSiteKg + offSiteKg,
      onSiteCompostedKg: onSiteKg,
      offSiteProcessedKg: offSiteKg,
      offSiteDiversionSharePct:
        onSiteKg + offSiteKg > 0 ? (offSiteKg / (onSiteKg + offSiteKg)) * 100 : 0,
      openConsignmentsCount: Array.from(this.consignments.values()).filter(
        (c) => c.status === 'DISPATCHED'
      ).length,
    };
  }
}
