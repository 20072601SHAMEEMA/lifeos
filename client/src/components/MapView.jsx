import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSettings } from '../context/SettingsContext.jsx';

/** Custom HTML markers — avoids Leaflet's default image paths and matches the app style. */
const iconCache = {};
function pinIcon(kind) {
  if (!iconCache[kind]) {
    iconCache[kind] = L.divIcon({
      className: '',
      html: `<span class="map-pin map-pin--${kind}"><span></span></span>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -14],
    });
  }
  return iconCache[kind];
}

function FitView({ center, bounds, zoom }) {
  const map = useMap();
  const key = bounds ? JSON.stringify(bounds) : center ? `${center.lat},${center.lng}` : '';
  useEffect(() => {
    if (bounds && bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    else if (center) map.setView([center.lat, center.lng], zoom ?? map.getZoom(), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    // Leaflet needs a nudge when its container size changes (responsive layouts, tabs).
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

/**
 * markers: [{ id, lat, lng, kind: 'me'|'start'|'dest'|'hospital'|'police'|'fire'|'pharmacy', title, popup }]
 */
export default function MapView({ center, zoom = 14, markers = [], path, accuracy, fit = false, height = 320, label = 'Map' }) {
  const { settings } = useSettings();
  const dark = settings.theme !== 'light';
  const valid = markers.filter((m) => typeof m.lat === 'number' && typeof m.lng === 'number');
  const bounds = fit && valid.length > 1 ? valid.map((m) => [m.lat, m.lng]) : null;
  const c = center || valid[0];

  if (!c) return null;

  return (
    <div className="map-shell" style={{ height }} role="region" aria-label={label}>
      <MapContainer center={[c.lat, c.lng]} zoom={zoom} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          key={dark ? 'dark' : 'light'}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={`https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'rastertiles/voyager'}/{z}/{x}/{y}{r}.png`}
        />
        {accuracy && center && (
          <Circle center={[center.lat, center.lng]} radius={accuracy} pathOptions={{ color: '#22d3ee', weight: 1, fillOpacity: 0.08 }} />
        )}
        {path && path.length > 1 && (
          <Polyline positions={path} pathOptions={{ color: '#22d3ee', weight: 4, dashArray: '8 10', opacity: 0.85 }} />
        )}
        {valid.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={pinIcon(m.kind || 'me')} title={m.title} alt={m.title}>
            {(m.popup || m.title) && <Popup>{m.popup || m.title}</Popup>}
          </Marker>
        ))}
        <FitView center={c} bounds={bounds} zoom={zoom} />
      </MapContainer>
    </div>
  );
}
