import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { useMapStore } from '@/store/map.store';
import { telemetryApi } from '@/api/telemetry.api';
import FacilityMarker from './FacilityMarker';
import ClusterMarker from './ClusterMarker';
import { clusterFacilities } from './spatial-cluster';
import MapLegend from './MapLegend';
import { INDORE_CENTER, DEFAULT_ZOOM, MOCK_FACILITIES } from './mapConstants';
import type { Facility, FacilityStatus } from '@/types';

const TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL ??
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const TILE_ATTRIBUTION =
  '&copy; <a href="https://carto.com/">CARTO</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Filter bar inside the map
function StatusFilterBar() {
  const { filterStatus, setFilterStatus } = useMapStore();
  const statuses: (FacilityStatus | 'ALL')[] = [
    'ALL',
    'HEALTHY',
    'ACID_CRASH_RISK',
    'ANAEROBIC_DANGER',
    'SENSOR_OFFLINE',
    'BOX_FULL',
    'HARDWARE_TAMPERED',
  ];

  return (
    <div className="leaflet-top leaflet-left" style={{ pointerEvents: 'none', marginTop: 10, marginLeft: 10 }}>
      <div
        className="leaflet-control"
        style={{
          background: 'rgba(17,24,39,0.92)',
          border: '1px solid #1F2937',
          borderRadius: 8,
          padding: 6,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          maxWidth: 360,
          pointerEvents: 'auto',
        }}
      >
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              fontSize: 10,
              padding: '3px 8px',
              borderRadius: 4,
              border: '1px solid',
              borderColor: filterStatus === s ? '#16A34A' : '#374151',
              background: filterStatus === s ? '#16A34A22' : 'transparent',
              color: filterStatus === s ? '#16A34A' : '#9CA3AF',
              cursor: 'pointer',
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            {s === 'ALL' ? 'ALL' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
    </div>
  );
}

// Syncs facility data from API to Zustand store
function FacilityDataSync() {
  const { data } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => telemetryApi.getFacilities(),
    refetchInterval: 30_000,
    // Fall back to mock data if API not ready
    placeholderData: { success: true, data: MOCK_FACILITIES, total: MOCK_FACILITIES.length, page: 1, limit: 500 },
  });
  const setFacilities = useMapStore((s) => s.setFacilities);

  useEffect(() => {
    if (data?.data) {
      setFacilities(data.data as any);
    }
  }, [data, setFacilities]);

  return null;
}

// Zoom-reactive Geohash & Spatial Grid Clustering Layer (Workstream G1)
function ClusteredLayer({
  displayFacilities,
  selectedFacilityId,
  selectFacility,
}: {
  displayFacilities: Facility[];
  selectedFacilityId: string | null;
  selectFacility: (id: string) => void;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom());
    map.on('zoomend', handleZoom);
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map]);

  const { clusters, unclustered } = useMemo(
    () => clusterFacilities(displayFacilities, zoom),
    [displayFacilities, zoom]
  );

  return (
    <>
      {clusters.map((cluster) => (
        <ClusterMarker key={cluster.id} cluster={cluster} />
      ))}
      {unclustered.map((facility) => (
        <FacilityMarker
          key={facility.id}
          facility={facility as any}
          isSelected={selectedFacilityId === facility.id}
          onClick={selectFacility}
        />
      ))}
    </>
  );
}

export default function IndoreNOCMap() {
  const { facilities, selectedFacilityId, filterStatus, selectFacility } = useMapStore();

  const displayFacilities =
    filterStatus === 'ALL'
      ? facilities.length > 0 ? facilities : MOCK_FACILITIES
      : (facilities.length > 0 ? facilities : MOCK_FACILITIES).filter(
          (f) => f.status === filterStatus,
        );

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-hq-border">
      <MapContainer
        center={INDORE_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          maxZoom={19}
        />
        <FacilityDataSync />

        <ClusteredLayer
          displayFacilities={displayFacilities as any}
          selectedFacilityId={selectedFacilityId}
          selectFacility={selectFacility}
        />

        <StatusFilterBar />
        <MapLegend />
      </MapContainer>
    </div>
  );
}
