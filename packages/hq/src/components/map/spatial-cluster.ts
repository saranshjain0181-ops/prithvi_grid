import type { Facility, FacilityStatus } from '@/types';
import type { SpatialCluster } from './ClusterMarker';

const STATUS_SEVERITY: Record<FacilityStatus, number> = {
  ANAEROBIC_DANGER: 5,
  ACID_CRASH_RISK: 4,
  BOX_FULL: 3,
  HARDWARE_TAMPERED: 2,
  SENSOR_OFFLINE: 1,
  HEALTHY: 0,
};

/**
 * Cluster facilities into geographic grid cells when zoomed out
 */
export function clusterFacilities(
  facilities: Facility[],
  zoom: number
): { clusters: SpatialCluster[]; unclustered: Facility[] } {
  // At high zoom (>= 13), show individual pins
  if (zoom >= 13 || facilities.length <= 8) {
    return { clusters: [], unclustered: facilities };
  }

  // Grid step size varies with zoom level
  const step = zoom <= 10 ? 0.08 : zoom <= 11 ? 0.04 : 0.02;

  const grid = new Map<string, Facility[]>();

  for (const f of facilities) {
    const latBin = Math.floor(f.coordinates.lat / step);
    const lngBin = Math.floor(f.coordinates.lng / step);
    const key = `${latBin}:${lngBin}`;

    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key)!.push(f);
  }

  const clusters: SpatialCluster[] = [];
  const unclustered: Facility[] = [];

  for (const [key, items] of grid.entries()) {
    if (items.length === 1) {
      unclustered.push(items[0]);
    } else {
      const avgLat = items.reduce((sum, i) => sum + i.coordinates.lat, 0) / items.length;
      const avgLng = items.reduce((sum, i) => sum + i.coordinates.lng, 0) / items.length;

      // Determine highest severity status
      let highestStatus: FacilityStatus = 'HEALTHY';
      let highestSeverity = -1;

      for (const i of items) {
        const sev = STATUS_SEVERITY[i.status] ?? 0;
        if (sev > highestSeverity) {
          highestSeverity = sev;
          highestStatus = i.status;
        }
      }

      clusters.push({
        id: `cluster-${key}`,
        centroidLat: avgLat,
        centroidLng: avgLng,
        facilities: items,
        dominantStatus: highestStatus,
      });
    }
  }

  return { clusters, unclustered };
}
