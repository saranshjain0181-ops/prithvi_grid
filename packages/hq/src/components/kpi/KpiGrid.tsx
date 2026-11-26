import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { telemetryApi } from '@/api/telemetry.api';
import FleetMRRCard from './FleetMRRCard';
import DataPacketsCard from './DataPacketsCard';
import ActiveDutyCard from './ActiveDutyCard';
import ViolationsCard from './ViolationsCard';
import type { KpiData, SocketKpiUpdate } from '@/types';

const MOCK_KPI: KpiData = {
  fleetMRR: 127500,
  fleetMRRTrend: 8.3,
  dataPacketsToday: 48_391,
  lastPacketAt: new Date(Date.now() - 45_000).toISOString(),
  activeLabours: 23,
  totalLabours: 28,
  violationsPrevented: 14,
};

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000';

export default function KpiGrid() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['kpis'],
    queryFn: () => telemetryApi.getKpis(),
    refetchInterval: 60_000,
    placeholderData: { success: true, data: MOCK_KPI },
  });

  // Live Socket.IO updates
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionDelay: 2000,
    });

    socket.on('KPI_UPDATE', (_payload: SocketKpiUpdate['payload']) => {
      // Invalidate & refetch — TanStack Query handles cache merge
      refetch();
    });

    return () => {
      socket.disconnect();
    };
  }, [refetch]);

  const kpi = data?.data ?? MOCK_KPI;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <FleetMRRCard data={kpi} isLoading={isLoading} />
      <DataPacketsCard data={kpi} isLoading={isLoading} />
      <ActiveDutyCard data={kpi} isLoading={isLoading} />
      <ViolationsCard data={kpi} isLoading={isLoading} />
    </div>
  );
}
