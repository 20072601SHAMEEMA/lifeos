import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CornerUpRight, FlaskConical, Flame, Globe, Hospital, LocateFixed, MapPin, Phone, Pill, RefreshCw, Shield } from 'lucide-react';
import MapView from '../components/MapView.jsx';
import { Card, EmptyState, Notice, PageHeader, Segmented, Skeleton, Spinner } from '../components/ui.jsx';
import { useUserLocation } from '../context/LocationContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { fetchLiveServices, getDemoServices } from '../services/nearbyService.js';
import { DEFAULT_CENTER } from '../data/mockServices.js';
import { directionsLink, formatDistance, telHref } from '../utils/format.js';

const TYPES = {
  hospital: { label: 'Hospital', icon: Hospital, tone: 'danger' },
  police: { label: 'Police station', icon: Shield, tone: 'primary' },
  fire: { label: 'Fire station', icon: Flame, tone: 'warning' },
  pharmacy: { label: 'Pharmacy', icon: Pill, tone: 'success' },
};

const FILTERS = [
  { value: 'all', label: 'All', icon: Building2 },
  { value: 'hospital', label: 'Hospitals', icon: Hospital },
  { value: 'police', label: 'Police', icon: Shield },
  { value: 'fire', label: 'Fire', icon: Flame },
  { value: 'pharmacy', label: 'Pharmacies', icon: Pill },
];

export default function Nearby() {
  useDocumentTitle('Nearby Services');
  const loc = useUserLocation();
  const [source, setSource] = useState('live'); // live | demo
  const [filter, setFilter] = useState('all');
  const [services, setServices] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null);

  const origin = loc.position;

  const load = useCallback(
    async (mode = source) => {
      if (!origin && mode === 'live') return;
      setStatus('loading');
      setNotice('');
      if (mode === 'demo') {
        setServices(getDemoServices(origin || DEFAULT_CENTER));
        setStatus('ready');
        return;
      }
      try {
        const list = await fetchLiveServices(origin);
        if (!list.length) {
          setNotice('No services were found in OpenStreetMap within 5 km. Showing demo data instead.');
          setServices(getDemoServices(origin));
          setSource('demo');
        } else setServices(list);
        setStatus('ready');
      } catch {
        setNotice('Live map data is unavailable right now (network or rate limit). Showing demo data instead.');
        setServices(getDemoServices(origin));
        setSource('demo');
        setStatus('ready');
      }
    },
    [origin, source],
  );

  useEffect(() => {
    if (origin) load(source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.lat, origin?.lng]);

  const visible = useMemo(() => services.filter((s) => filter === 'all' || s.type === filter), [services, filter]);
  const counts = useMemo(() => Object.fromEntries(Object.keys(TYPES).map((t) => [t, services.filter((s) => s.type === t).length])), [services]);

  const switchSource = (mode) => {
    setSource(mode);
    load(mode);
  };

  const center = origin || DEFAULT_CENTER;
  const markers = [
    ...(origin ? [{ id: 'me', lat: origin.lat, lng: origin.lng, kind: 'me', title: 'You are here' }] : []),
    ...visible.slice(0, 60).map((s) => ({
      id: s.id,
      lat: s.lat,
      lng: s.lng,
      kind: s.type,
      title: s.name,
      popup: (
        <div className="map-popup">
          <strong>{s.name}</strong>
          <span>
            {TYPES[s.type].label} · {formatDistance(s.distance)}
          </span>
        </div>
      ),
    })),
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Help nearby"
        title="Nearby Emergency Services"
        subtitle="Hospitals, police, fire stations and pharmacies around you."
        actions={
          origin && (
            <button className="btn btn--ghost" onClick={() => load(source)} disabled={status === 'loading'}>
              {status === 'loading' ? <Spinner size={16} /> : <RefreshCw size={16} />} Refresh
            </button>
          )
        }
      />

      {!origin ? (
        <Card>
          <EmptyState
            icon={MapPin}
            title={loc.status === 'error' ? 'We couldn’t get your location' : 'Share your location to find help nearby'}
            text={loc.error || 'Your location is only used to search for services around you and is not stored on our server.'}
            action={
              <div className="btn-row">
                {loc.status !== 'unsupported' && (
                  <button className="btn btn--primary" onClick={loc.locate} disabled={loc.status === 'loading'}>
                    {loc.status === 'loading' ? <Spinner size={16} /> : <LocateFixed size={16} />} Use my location
                  </button>
                )}
                <button
                  className="btn btn--ghost"
                  onClick={() => {
                    setSource('demo');
                    setServices(getDemoServices(DEFAULT_CENTER));
                    setStatus('ready');
                  }}
                >
                  <FlaskConical size={16} /> View demo data
                </button>
              </div>
            }
          />
        </Card>
      ) : null}

      {(origin || status === 'ready') && (
        <>
          <div className="toolbar">
            <Segmented label="Service type" options={FILTERS} value={filter} onChange={setFilter} />
            {origin && (
              <Segmented
                label="Data source"
                value={source}
                onChange={switchSource}
                options={[
                  { value: 'live', label: 'Live (OSM)', icon: Globe },
                  { value: 'demo', label: 'Demo', icon: FlaskConical },
                ]}
              />
            )}
          </div>

          {source === 'demo' ? (
            <Notice tone="warning" icon={FlaskConical} title="Demo data">
              {notice || 'These places are fictional examples generated around your location. Do not rely on them in an emergency.'}
            </Notice>
          ) : (
            <Notice tone="info" icon={Globe}>
              Live data from OpenStreetMap contributors. Details may be incomplete — always call your local emergency number in a life-threatening
              situation.
            </Notice>
          )}

          <div className="nearby-layout">
            <Card className="nearby-map">
              <MapView center={selected || center} zoom={selected ? 16 : 14} markers={markers} height={460} label="Map of nearby emergency services" />
              <ul className="legend-row" aria-label="Map legend">
                {Object.entries(TYPES).map(([k, t]) => (
                  <li key={k}>
                    <span className={`legend-dot legend-dot--${k}`} aria-hidden="true" /> {t.label} ({counts[k] || 0})
                  </li>
                ))}
              </ul>
            </Card>

            <div className="nearby-list" aria-busy={status === 'loading'}>
              {status === 'loading' ? (
                [0, 1, 2, 3].map((i) => (
                  <Card key={i}>
                    <Skeleton height={20} width="70%" />
                    <Skeleton height={14} width="45%" style={{ marginTop: 10 }} />
                  </Card>
                ))
              ) : visible.length === 0 ? (
                <EmptyState icon={Building2} title="No services found" text="Try a different filter or switch data source." />
              ) : (
                visible.map((s) => {
                  const t = TYPES[s.type];
                  return (
                    <article key={s.id} className={`card service-card ${selected?.id === s.id ? 'is-selected' : ''}`}>
                      <button className="service-card__main" onClick={() => setSelected(s)} aria-label={`Show ${s.name} on map`}>
                        <span className={`icon-chip icon-chip--${t.tone}`} aria-hidden="true">
                          <t.icon size={18} />
                        </span>
                        <span className="service-card__text">
                          <strong>{s.name}</strong>
                          <small>
                            {t.label} · {s.address}
                          </small>
                        </span>
                        <span className="service-card__dist">{formatDistance(s.distance)}</span>
                      </button>
                      <div className="service-card__actions">
                        {s.phone ? (
                          <a className="btn btn--success btn--sm" href={telHref(s.phone)}>
                            <Phone size={14} /> Call
                          </a>
                        ) : (
                          <span className="muted small">No phone listed</span>
                        )}
                        <a className="btn btn--ghost btn--sm" href={directionsLink(s)} target="_blank" rel="noreferrer">
                          <CornerUpRight size={14} /> Directions
                        </a>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
