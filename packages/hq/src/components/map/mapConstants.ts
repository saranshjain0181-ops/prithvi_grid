import type { FacilityStatus } from '@/types';

export const FACILITY_STATUS_COLORS: Record<FacilityStatus, string> = {
  HEALTHY: '#22C55E',
  ACID_CRASH_RISK: '#F97316',
  ANAEROBIC_DANGER: '#EF4444',
  SENSOR_OFFLINE: '#1F2937',
  BOX_FULL: '#A855F7',
  HARDWARE_TAMPERED: '#FBBF24',
};

export const FACILITY_STATUS_LABELS: Record<FacilityStatus, string> = {
  HEALTHY: 'Healthy',
  ACID_CRASH_RISK: 'Acid Crash Risk',
  ANAEROBIC_DANGER: 'Anaerobic Danger',
  SENSOR_OFFLINE: 'Sensor Offline',
  BOX_FULL: 'Box Full',
  HARDWARE_TAMPERED: 'Hardware Tampered',
};

export const STATUS_ICONS: Record<FacilityStatus, string> = {
  HEALTHY: '🟢',
  ACID_CRASH_RISK: '🟠',
  ANAEROBIC_DANGER: '🔴',
  SENSOR_OFFLINE: '⚫',
  BOX_FULL: '🟣',
  HARDWARE_TAMPERED: '⚠️',
};

// Indore city center coordinates
export const INDORE_CENTER: [number, number] = [22.7196, 75.8577];
export const DEFAULT_ZOOM = 12;

// Mock facility data for development / demo
export const MOCK_FACILITIES = [
  {
    id: 'fac-001',
    entityId: 'ent-001',
    facilityName: 'Vijay Nagar RWA',
    coordinates: { lat: 22.753, lng: 75.893 },
    status: 'HEALTHY' as FacilityStatus,
    lastPing: new Date(Date.now() - 60_000).toISOString(),
    sensors: { temperature: 58, moisture: 52, methane: 210, ph: 6.8, pressure: 1012 },
  },
  {
    id: 'fac-002',
    entityId: 'ent-002',
    facilityName: 'Palasia Market',
    coordinates: { lat: 22.722, lng: 75.868 },
    status: 'ACID_CRASH_RISK' as FacilityStatus,
    lastPing: new Date(Date.now() - 300_000).toISOString(),
    sensors: { temperature: 52, moisture: 65, methane: 280, ph: 5.4, pressure: 1016 },
  },
  {
    id: 'fac-003',
    entityId: 'ent-003',
    facilityName: 'Government Hospital Sector-C',
    coordinates: { lat: 22.705, lng: 75.842 },
    status: 'ANAEROBIC_DANGER' as FacilityStatus,
    lastPing: new Date(Date.now() - 600_000).toISOString(),
    sensors: { temperature: 43, moisture: 72, methane: 420, ph: 6.1, pressure: 1017 },
  },
  {
    id: 'fac-004',
    entityId: 'ent-004',
    facilityName: 'Scheme No. 54 School',
    coordinates: { lat: 22.745, lng: 75.83 },
    status: 'SENSOR_OFFLINE' as FacilityStatus,
    lastPing: new Date(Date.now() - 3_600_000).toISOString(),
    sensors: { temperature: 0, moisture: 0, methane: 0, ph: 0, pressure: 0 },
  },
  {
    id: 'fac-005',
    entityId: 'ent-005',
    facilityName: 'LIG Square Housing Society',
    coordinates: { lat: 22.69, lng: 75.875 },
    status: 'BOX_FULL' as FacilityStatus,
    lastPing: new Date(Date.now() - 120_000).toISOString(),
    sensors: { temperature: 59, moisture: 48, methane: 195, ph: 7.0, pressure: 1014 },
  },
  {
    id: 'fac-006',
    entityId: 'ent-006',
    facilityName: 'Bhanwarkuan Complex',
    coordinates: { lat: 22.732, lng: 75.856 },
    status: 'HARDWARE_TAMPERED' as FacilityStatus,
    lastPing: new Date(Date.now() - 900_000).toISOString(),
    sensors: { temperature: 61, moisture: 45, methane: 230, ph: 6.9, pressure: 1013 },
  },
];
