import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Tooltip, ZoomControl, AttributionControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Map as MapIcon, Satellite } from 'lucide-react';
import { STATUS_COLORS } from './StatusBadge.jsx';

const DEFAULT_CENTER = [29.0, 77.0];

/**
 * Base maps. Esri's World Street Map and World Imagery are free to use with attribution and need
 * no API key, and they carry English labels everywhere. A custom provider (MapTiler, Thunderforest,
 * Google via a proxy, ...) can replace the street layer through VITE_MAP_TILE_URL / VITE_MAP_TILE_ATTR.
 */
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const BASEMAPS = {
  streets: {
    label: 'Map',
    icon: MapIcon,
    url: import.meta.env.VITE_MAP_TILE_URL || `${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`,
    attribution: import.meta.env.VITE_MAP_TILE_ATTR || 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors',
    maxZoom: 19,
  },
  satellite: {
    label: 'Satellite',
    icon: Satellite,
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    overlay: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, // place names on top of imagery
    maxZoom: 19,
  },
};
const STORAGE_KEY = 'fleettrack.basemap';
const readBasemap = () => { try { const v = localStorage.getItem(STORAGE_KEY); return v in BASEMAPS ? v : 'streets'; } catch { return 'streets'; } };

const TRUCK = `<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>`;

/** White rounded tile with a truck, coloured by status; a yellow ring marks the selected vehicle. */
function vehicleIcon(status, selected) {
  const color = STATUS_COLORS[status] || '#6F737B';
  const size = selected ? 44 : 36;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `<div style="position:relative;width:${size}px;height:${size}px;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px -8px rgba(23,25,29,.45)${selected ? ',0 0 0 3px #F7B500' : ''}">
      <svg width="${Math.round(size * 0.58)}" height="${Math.round(size * 0.58)}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TRUCK}</svg>
      <span style="position:absolute;right:-3px;top:-3px;width:11px;height:11px;border-radius:50%;background:${color};border:2px solid #fff"></span>
    </div>`,
  });
}

function Viewport({ focus, fit }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo(focus, Math.max(map.getZoom(), 9), { duration: 0.6 });
  }, [focus, map]);
  useEffect(() => {
    if (!fit?.length) return undefined;
    // Wait a frame so the container has its final size, otherwise Leaflet fits the wrong box.
    const t = setTimeout(() => {
      map.invalidateSize();
      if (fit.length > 1) map.fitBounds(fit, { padding: [48, 48] });
      else map.setView(fit[0], 10);
    }, 60);
    return () => clearTimeout(t);
  }, [JSON.stringify(fit), map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Map / Satellite switch, drawn over the map. Clicks must not reach the map underneath. */
function BasemapToggle({ value, onChange, offsetForZoom }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) { L.DomEvent.disableClickPropagation(ref.current); L.DomEvent.disableScrollPropagation(ref.current); } }, []);
  return (
    <div ref={ref} className={`absolute right-2.5 z-[1000] flex rounded-xl border border-line bg-white p-1 shadow-float ${offsetForZoom ? 'top-24' : 'top-2.5'}`} role="group" aria-label="Map style">
      {Object.entries(BASEMAPS).map(([key, b]) => {
        const Icon = b.icon;
        const active = key === value;
        return (
          <button key={key} type="button" onClick={() => onChange(key)} title={`${b.label} view`} aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${active ? 'bg-ink text-white' : 'text-ink-soft hover:bg-cream hover:text-ink'}`}>
            <Icon size={14} /> <span className="hidden sm:inline">{b.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * vehicles: [{_id, registrationNo, status, location:{lat,lng}, ...}]
 * lines:    [{id, positions:[[lat,lng],...], color, dashed, weight}]
 * pins:     [{id, position:[lat,lng], label, color, permanent}]
 * fit:      [[lat,lng],...] bounds to fit; focus follows selectedId.
 * popup:    (vehicle) => node, or false to disable popups.
 * basemapToggle: show the Map / Satellite switch (default true).
 */
export default function MapView({ vehicles = [], lines = [], pins = [], selectedId, onSelect, fit, popup, zoom = 7, interactive = true, attribution = 'bottomright', basemapToggle = true, children }) {
  const [basemap, setBasemap] = useState(readBasemap);
  const base = BASEMAPS[basemap];
  const changeBasemap = (key) => { setBasemap(key); try { localStorage.setItem(STORAGE_KEY, key); } catch { /* private mode: keep in memory only */ } };
  const selected = vehicles.find((v) => v._id === selectedId);
  const focus = selected?.location ? [selected.location.lat, selected.location.lng] : null;
  const lineColor = basemap === 'satellite' ? '#FFD23F' : '#E8553F';
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={zoom}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      keyboard={interactive}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer key={basemap} attribution={base.attribution} url={base.url} maxZoom={base.maxZoom} />
      {base.overlay && <TileLayer url={base.overlay} maxZoom={base.maxZoom} />}
      <AttributionControl position={attribution} prefix={false} />
      {interactive && <ZoomControl position="topright" />}
      {basemapToggle && <BasemapToggle value={basemap} onChange={changeBasemap} offsetForZoom={interactive} />}
      <Viewport focus={focus} fit={fit} />
      {lines.map((l) => (
        <Polyline
          key={l.id}
          positions={l.positions}
          pathOptions={{ color: l.color || lineColor, weight: l.weight || 3, dashArray: l.dashed ? '6 8' : undefined, opacity: 0.9, lineCap: 'round' }}
        />
      ))}
      {pins.map((p) => (
        <CircleMarker key={p.id} center={p.position} radius={7} pathOptions={{ color: '#fff', weight: 3, fillColor: p.color || '#17191D', fillOpacity: 1 }}>
          {p.label && <Tooltip direction="top" offset={[0, -8]} permanent={p.permanent}>{p.label}</Tooltip>}
        </CircleMarker>
      ))}
      {vehicles.filter((v) => v.location).map((v) => (
        <Marker
          key={v._id}
          position={[v.location.lat, v.location.lng]}
          icon={vehicleIcon(v.status, v._id === selectedId)}
          eventHandlers={{ click: () => onSelect?.(v._id) }}
        >
          {popup !== false && <Popup>{popup ? popup(v) : <strong>{v.registrationNo}</strong>}</Popup>}
        </Marker>
      ))}
      {children}
    </MapContainer>
  );
}
