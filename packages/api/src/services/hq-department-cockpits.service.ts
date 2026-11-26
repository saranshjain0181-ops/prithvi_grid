import { HqDepartmentType, IHqTicketHandoff } from '../db/models/HqDepartmentCockpits.js';

export interface DepartmentKpiOverview {
  department: HqDepartmentType;
  kpiName: string;
  kpiValue: string;
  status: 'HEALTHY' | 'WARNING' | 'ALERT';
  pendingInboundHandoffsCount: number;
  activeWorkflowsSummary: string;
}

export class HqDepartmentCockpitsService {
  /**
   * Retrieves deterministic KPI overview for any HQ department
   */
  getDepartmentKpiOverview(params: {
    department: HqDepartmentType;
    inboundHandoffs: IHqTicketHandoff[];
  }): DepartmentKpiOverview {
    const pendingInbound = params.inboundHandoffs.filter(
      (h) => h.targetDepartment === params.department && h.status === 'PENDING'
    );

    switch (params.department) {
      case 'FLEET_FIELD_SERVICE':
        return {
          department: params.department,
          kpiName: 'Fleet Telemetry Health',
          kpiValue: '99.4% Usable Packets',
          status: 'HEALTHY',
          pendingInboundHandoffsCount: pendingInbound.length,
          activeWorkflowsSummary: 'Zero sensor hardware anomalies pending field replacement.',
        };
      case 'CUSTOMER_SUCCESS':
        return {
          department: params.department,
          kpiName: 'Client Engagement & NPS',
          kpiValue: 'NPS +62',
          status: 'HEALTHY',
          pendingInboundHandoffsCount: pendingInbound.length,
          activeWorkflowsSummary: 'All facility managers active on daily morning plan approval.',
        };
      case 'FINANCE_COMMERCIAL':
        return {
          department: params.department,
          kpiName: 'Contractor Variance Deductions',
          kpiValue: '₹1.8L Recovered',
          status: 'HEALTHY',
          pendingInboundHandoffsCount: pendingInbound.length,
          activeWorkflowsSummary: 'Contractor invoices auto-reconciled against sensor-verified labour turns.',
        };
      case 'PLATFORM_AI_OPS':
        return {
          department: params.department,
          kpiName: 'AI Gateway Latency & Integrity',
          kpiValue: '185ms (Gemini Only)',
          status: 'HEALTHY',
          pendingInboundHandoffsCount: pendingInbound.length,
          activeWorkflowsSummary: '100% deterministic decision interlock; zero third-party AI dependencies.',
        };
    }
  }

  /**
   * Creates a cross-department handoff ticket across the operational spine
   */
  createHandoffTicket(params: {
    sourceDepartment: HqDepartmentType;
    targetDepartment: HqDepartmentType;
    title: string;
    facilityId: string;
    priority?: 'ROUTINE' | 'ELEVATED' | 'CRITICAL';
  }): IHqTicketHandoff {
    const handoffId = `HO-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    return {
      handoffId,
      sourceDepartment: params.sourceDepartment,
      targetDepartment: params.targetDepartment,
      title: params.title,
      facilityId: params.facilityId,
      priority: params.priority || 'ROUTINE',
      status: 'PENDING',
      routedAt: new Date(),
    };
  }

  /**
   * Progresses ticket state
   */
  transitionHandoffStatus(
    ticket: IHqTicketHandoff,
    newStatus: 'ACCEPTED' | 'COMPLETED'
  ): IHqTicketHandoff {
    return {
      ...ticket,
      status: newStatus,
      resolvedAt: newStatus === 'COMPLETED' ? new Date() : ticket.resolvedAt,
    };
  }
}

export const hqDepartmentCockpitsService = new HqDepartmentCockpitsService();
