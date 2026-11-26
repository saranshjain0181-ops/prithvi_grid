import { SiteMap, ISiteMap, IMapZone, IMapNodePlacement } from '../db/models/SiteMap.js';
import crypto from 'crypto';

export interface SensitiveZoneProximityAlert {
  pitId: string;
  zoneId: string;
  zoneName: string;
  zoneType: string;
  actualDistanceMeters: number;
  minimumBufferMeters: number;
  isBreached: boolean;
}

export class SiteMapService {
  /**
   * Calculates straight-line Euclidean distance between two 2D points in meters
   */
  calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.round(Math.sqrt(dx * dx + dy * dy) * 10) / 10;
  }

  /**
   * Calculates total walking distance for a route sequence of nodes
   */
  calculatePathDistance(nodes: Array<{ nodeId: string; xMeters: number; yMeters: number }>, routeNodeIds: string[]): number {
    if (routeNodeIds.length <= 1) return 0;
    const nodeCoordMap = new Map<string, { x: number; y: number }>();
    for (const n of nodes) {
      nodeCoordMap.set(n.nodeId, { x: n.xMeters, y: n.yMeters });
    }

    let totalMeters = 0;
    for (let i = 0; i < routeNodeIds.length - 1; i++) {
      const from = nodeCoordMap.get(routeNodeIds[i]);
      const to = nodeCoordMap.get(routeNodeIds[i + 1]);
      if (from && to) {
        totalMeters += this.calculateDistance(from.x, from.y, to.x, to.y);
      }
    }
    return Math.round(totalMeters * 10) / 10;
  }

  /**
   * Pure evaluation of buffer distances between placed pits and sensitive zones
   */
  evaluateBufferZones(
    zones: IMapZone[],
    nodes: IMapNodePlacement[]
  ): SensitiveZoneProximityAlert[] {
    const sensitiveZones = zones.filter(
      (z) => z.type === 'SENSITIVE_ZONE_HOTEL_GUEST' || z.type === 'SENSITIVE_ZONE_HOSPITAL_WARD'
    );

    const alerts: SensitiveZoneProximityAlert[] = [];
    for (const node of nodes) {
      if (!node.pitId) continue;

      for (const zone of sensitiveZones) {
        const dist = this.calculateDistance(node.xMeters, node.yMeters, zone.xMeters, zone.yMeters);
        const isBreached = dist < zone.odorBufferMeters;
        alerts.push({
          pitId: node.pitId,
          zoneId: zone.zoneId,
          zoneName: zone.name,
          zoneType: zone.type,
          actualDistanceMeters: dist,
          minimumBufferMeters: zone.odorBufferMeters,
          isBreached,
        });
      }
    }
    return alerts;
  }

  /**
   * Creates or updates a yard site map in db
   */
  async upsertSiteMap(data: Partial<ISiteMap>): Promise<ISiteMap> {
    const siteMapId = data.siteMapId || `MAP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const map = await SiteMap.findOneAndUpdate(
      { facilityId: data.facilityId },
      { ...data, siteMapId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return map;
  }

  /**
   * Calculates total walking distance for a planned sequence of node visits from database
   */
  async calculateRouteDistance(facilityId: string, nodeIds: string[]): Promise<number> {
    const map = await SiteMap.findOne({ facilityId });
    if (!map) return 0;
    return this.calculatePathDistance(map.nodes, nodeIds);
  }

  /**
   * Checks sensitive zone buffers from database
   */
  async checkSensitiveZoneBuffers(facilityId: string): Promise<SensitiveZoneProximityAlert[]> {
    const map = await SiteMap.findOne({ facilityId });
    if (!map) return [];
    return this.evaluateBufferZones(map.zones, map.nodes);
  }
}

export const siteMapService = new SiteMapService();
