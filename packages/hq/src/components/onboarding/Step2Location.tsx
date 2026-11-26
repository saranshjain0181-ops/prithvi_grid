import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { OnboardingFormData, Coordinates } from '@/types';
import { INDORE_CENTER } from '@/components/map/mapConstants';

// Fix leaflet default icon missing in bundlers
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

interface Step2Props {
  data: OnboardingFormData;
  onChange: (field: keyof OnboardingFormData, value: unknown) => void;
}

function PinDropper({ onDrop }: { onDrop: (coords: Coordinates) => void }) {
  useMapEvents({
    click(e) {
      onDrop({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function Step2Location({ data, onChange }: Step2Props) {
  const handleMapClick = (coords: Coordinates) => {
    onChange('coordinates', coords);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-hq-text">Facility Location</h2>
        <p className="text-sm text-hq-muted mt-1">Name the facility and pin its exact location on the map</p>
      </div>

      {/* Facility name */}
      <div>
        <label className="hq-label">Facility Name *</label>
        <input
          className="hq-input"
          value={data.facilityName}
          onChange={(e) => onChange('facilityName', e.target.value)}
          placeholder="e.g. Block-C Compost Unit"
        />
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-hq-border" style={{ height: 340 }}>
        <MapContainer
          center={
            data.coordinates
              ? [data.coordinates.lat, data.coordinates.lng]
              : INDORE_CENTER
          }
          zoom={13}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; CARTO"
          />
          <PinDropper onDrop={handleMapClick} />
          {data.coordinates && (
            <Marker position={[data.coordinates.lat, data.coordinates.lng]} />
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-hq-muted">Click anywhere on the map to drop a GPS pin</p>

      {/* Lat/Long display */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="hq-label">Latitude</label>
          <input
            className="hq-input font-mono"
            value={data.coordinates?.lat.toFixed(6) ?? ''}
            readOnly
            placeholder="Auto-filled from map"
          />
        </div>
        <div>
          <label className="hq-label">Longitude</label>
          <input
            className="hq-input font-mono"
            value={data.coordinates?.lng.toFixed(6) ?? ''}
            readOnly
            placeholder="Auto-filled from map"
          />
        </div>
      </div>
    </div>
  );
}
