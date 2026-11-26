import React from 'react';
import { CircleMarker, Popup, useMap } from 'react-leaflet';
import type { Facility, FacilityStatus } from '@/types';
import { FACILITY_STATUS_COLORS } from './mapConstants';

export interface SpatialCluster {
  id: string;
  centroidLat: number;
  centroidLng: number;
  facilities: Facility[];
  dominantStatus: FacilityStatus;
}

interface ClusterMarkerProps {
  cluster: SpatialCluster;
}

export const ClusterMarker: React.FC<ClusterMarkerProps> = ({ cluster }) => {
  const map = useMap();
  const count = cluster.facilities.length;

  const color = FACILITY_STATUS_COLORS[cluster.dominantStatus] || '#22C55E';
  const radius = Math.min(36, Math.max(16, 14 + Math.round(Math.sqrt(count) * 4)));

  const handleZoomToCluster = () => {
    map.setView([cluster.centroidLat, cluster.centroidLng], Math.min(16, map.getZoom() + 2), {
      animate: true,
    });
  };

  const statusCounts = cluster.facilities.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <CircleMarker
      center={[cluster.centroidLat, cluster.centroidLng]}
      radius={radius}
      pathOptions={{
        color: color,
        fillColor: color,
        fillOpacity: 0.8,
        weight: 3,
      }}
      eventHandlers={{
        click: handleZoomToCluster,
      }}
    >
      <Popup maxWidth={260}>
        <div className="p-1 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-gray-700 pb-1.5">
            <span className="font-bold text-sm text-white">Cluster: {count} Nodes</span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
              style={{ background: `${color}33`, color }}
            >
              {cluster.dominantStatus.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="space-y-1 text-gray-300">
            {Object.entries(statusCounts).map(([status, cnt]) => (
              <div key={status} className="flex justify-between">
                <span>{status.replace(/_/g, ' ')}:</span>
                <span className="font-bold font-mono">{cnt}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleZoomToCluster}
            className="w-full mt-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-center transition"
          >
            🔍 Zoom into Cluster
          </button>
        </div>
      </Popup>
    </CircleMarker>
  );
};

export default ClusterMarker;
