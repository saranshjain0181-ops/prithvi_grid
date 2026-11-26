import { CircleMarker, Popup } from 'react-leaflet';
import { formatDistanceToNow } from 'date-fns';
import type { Facility } from '@/types';
import { FACILITY_STATUS_COLORS, FACILITY_STATUS_LABELS } from './mapConstants';

interface FacilityMarkerProps {
  facility: Facility;
  isSelected: boolean;
  onClick: (id: string) => void;
}

export default function FacilityMarker({ facility, isSelected, onClick }: FacilityMarkerProps) {
  const color = FACILITY_STATUS_COLORS[facility.status];
  const label = FACILITY_STATUS_LABELS[facility.status];

  return (
    <CircleMarker
      center={[facility.coordinates.lat, facility.coordinates.lng]}
      radius={isSelected ? 14 : 10}
      pathOptions={{
        color: color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: isSelected ? 3 : 2,
      }}
      eventHandlers={{
        click: () => onClick(facility.id),
      }}
    >
      <Popup maxWidth={280}>
        <div className="text-sm space-y-2" style={{ minWidth: 220 }}>
          <div className="font-bold text-base" style={{ color }}>
            {facility.facilityName}
          </div>
          <div
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: `${color}22`, color }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {label}
          </div>
          <div className="text-gray-400 text-xs">
            Last ping: {formatDistanceToNow(new Date(facility.lastPing), { addSuffix: true })}
          </div>
          {facility.status !== 'SENSOR_OFFLINE' && (
            <table className="w-full text-xs mt-1 border-collapse">
              <tbody>
                {[
                  ['🌡️ Temp', `${facility.sensors.temperature}°C`],
                  ['💧 Moisture', `${facility.sensors.moisture}%`],
                  ['☢️ Methane', `${facility.sensors.methane} PPM`],
                  ['🧪 pH', `${facility.sensors.ph}`],
                  ['📊 Pressure', `${facility.sensors.pressure} hPa`],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-gray-700/40">
                    <td className="py-0.5 pr-2 text-gray-400">{k}</td>
                    <td className="py-0.5 font-mono text-gray-200">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="text-gray-500 font-mono text-xs">
            {facility.coordinates.lat.toFixed(4)}° N, {facility.coordinates.lng.toFixed(4)}° E
          </div>
        </div>
      </Popup>
    </CircleMarker>
  );
}
