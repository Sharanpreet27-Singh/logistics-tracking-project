import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { STATUS_COLORS } from './StatusBadge.jsx';

const DEFAULT_CENTER = [29.0, 77.0];

function vehicleIcon(status, selected) {
  const color = STATUS_COLORS[status] || '#5B6B7B';
  const size = selected ? 26 : 18;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:6px;background:${color};border:3px solid #fff;box-shadow:0 0 0 2px ${color}66, 0 2px 6px rgba(0,0,0,.35)"></div>`,
  });
}

function Viewport({ focus, fit }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo(focus, Math.max(map.getZoom(), 9), { duration: 0.6 });
  }, [focus, map]);
  useEffect(() => {
    if (fit?.length > 1) map.fitBounds(fit, { padding: [40, 40] });
  }, [JSON.stringify(fit), map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/**
 * vehicles: [{_id, registrationNo, status, location:{lat,lng}, ...}]
 * lines:    [{id, positions:[[lat,lng],...], color, dashed}]
 * pins:     [{id, position:[lat,lng], label, color}]
 */
export default function MapView({ vehicles = [], lines = [], pins = [], selectedId, onSelect, fit, popup }) {
  const selected = vehicles.find((v) => v._id === selectedId);
  const focus = selected?.location ? [selected.location.lat, selected.location.lng] : null;
  return (
    <MapContainer center={DEFAULT_CENTER} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Viewport focus={focus} fit={fit} />
      {lines.map((l) => (
        <Polyline key={l.id} positions={l.positions} pathOptions={{ color: l.color || '#2563EB', weight: l.weight || 3, dashArray: l.dashed ? '8 8' : undefined, opacity: 0.8 }} />
      ))}
      {pins.map((p) => (
        <CircleMarker key={p.id} center={p.position} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: p.color || '#1B2430', fillOpacity: 1 }}>
          <Tooltip direction="top" offset={[0, -6]} permanent={p.permanent}>{p.label}</Tooltip>
        </CircleMarker>
      ))}
      {vehicles.filter((v) => v.location).map((v) => (
        <Marker
          key={v._id}
          position={[v.location.lat, v.location.lng]}
          icon={vehicleIcon(v.status, v._id === selectedId)}
          eventHandlers={{ click: () => onSelect?.(v._id) }}
        >
          <Popup>{popup ? popup(v) : <strong>{v.registrationNo}</strong>}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
