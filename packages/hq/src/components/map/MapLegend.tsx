import { FACILITY_STATUS_COLORS, FACILITY_STATUS_LABELS } from './mapConstants';
import type { FacilityStatus } from '@/types';

const STATUSES = Object.keys(FACILITY_STATUS_COLORS) as FacilityStatus[];

export default function MapLegend() {
  return (
    <div
      className="leaflet-bottom leaflet-right"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="leaflet-control m-3"
        style={{
          background: 'rgba(17,24,39,0.92)',
          border: '1px solid #1F2937',
          borderRadius: 8,
          padding: '10px 14px',
          minWidth: 180,
          pointerEvents: 'auto',
        }}
      >
        <p style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>
          FACILITY STATUS
        </p>
        {STATUSES.map((status) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: FACILITY_STATUS_COLORS[status],
                flexShrink: 0,
                display: 'inline-block',
                border: `1px solid ${FACILITY_STATUS_COLORS[status]}`,
              }}
            />
            <span style={{ color: '#F8FAFC', fontSize: 11 }}>{FACILITY_STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
