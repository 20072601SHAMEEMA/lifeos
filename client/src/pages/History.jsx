import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Flag, History as HistoryIcon, MapPin, Siren } from 'lucide-react';
import { Card, EmptyState, ErrorState, PageHeader, Segmented, Skeleton } from '../components/ui.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { historyService } from '../services/index.js';
import { EVENT_META } from '../data/eventTypes.js';
import { dayLabel, formatCoord, formatTime, mapsLink } from '../utils/format.js';

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All' },
];

function rangeStart(range) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === 'today') return d.toISOString();
  if (range === 'week') {
    const offset = (d.getDay() + 6) % 7; // Monday as first day
    d.setDate(d.getDate() - offset);
    return d.toISOString();
  }
  if (range === 'month') {
    d.setDate(1);
    return d.toISOString();
  }
  return null;
}

const CATEGORY_FILTERS = [
  { value: 'all', label: 'All events' },
  { value: 'checkin', label: 'Check-ins', types: ['checkin'] },
  { value: 'journey', label: 'Journeys', types: ['journey_start', 'arrived', 'journey_cancel', 'journey_extend'] },
  { value: 'alerts', label: 'Alerts', types: ['sos', 'sos_resolved', 'contacts_alerted', 'call', 'location_shared'] },
];

export default function History() {
  useDocumentTitle('Safety History');
  const [range, setRange] = useState('week');
  const [category, setCategory] = useState('all');
  const { data, loading, error, reload } = useAsync(() => historyService.list(rangeStart(range)), [range]);

  const groups = useMemo(() => {
    const types = CATEGORY_FILTERS.find((c) => c.value === category)?.types;
    const events = (data?.events || []).filter((e) => !types || types.includes(e.type));
    const map = new Map();
    for (const e of events) {
      const key = dayLabel(e.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    return [...map.entries()];
  }, [data, category]);

  const stats = data?.stats;
  const STAT_TILES = [
    { label: 'Safe Check-ins', value: stats?.checkins, icon: CheckCircle2, tone: 'success' },
    { label: 'Journeys Completed', value: stats?.journeysCompleted, icon: Flag, tone: 'primary' },
    { label: 'Active Emergencies', value: stats?.activeEmergencies, icon: Siren, tone: stats?.activeEmergencies ? 'danger' : 'neutral' },
  ];

  return (
    <div className="page">
      <PageHeader eyebrow="Safety timeline" title="Safety History" subtitle="Every check-in, journey and alert — stored in your account so you can review what happened and when." />

      <div className="toolbar">
        <Segmented label="Time range" options={RANGES} value={range} onChange={setRange} />
        <select className="input input--sm" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Event type">
          {CATEGORY_FILTERS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="stat-grid">
        {STAT_TILES.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="stat-tile">
            <span className={`icon-chip icon-chip--${tone}`} aria-hidden="true">
              <Icon size={18} />
            </span>
            {loading ? <Skeleton height={36} width={60} /> : <strong className="stat-tile__value">{value ?? 0}</strong>}
            <span className="stat-tile__label">{label}</span>
          </Card>
        ))}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading ? (
        <Card>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={48} style={{ marginBottom: 14 }} />
          ))}
        </Card>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing here yet"
          text={range === 'today' ? 'No safety events today. Check in from the dashboard or start a journey.' : 'No events in this period.'}
        />
      ) : (
        <Card className="timeline-card">
          {groups.map(([day, events]) => (
            <section key={day} className="timeline-group" aria-label={day}>
              <h2 className="timeline-group__day">{day}</h2>
              <ol className="timeline">
                {events.map((e) => {
                  const meta = EVENT_META[e.type] || EVENT_META.default;
                  return (
                    <li key={e.id} className={`timeline__item timeline__item--${meta.tone}`}>
                      <span className="timeline__dot" aria-hidden="true">
                        <meta.icon size={15} />
                      </span>
                      <div className="timeline__body">
                        <div className="timeline__row">
                          <strong>{e.title}</strong>
                          <time dateTime={e.createdAt}>{formatTime(e.createdAt)}</time>
                        </div>
                        {e.detail && <p>{e.detail}</p>}
                        {e.location && (
                          <a className="timeline__loc" href={mapsLink(e.location)} target="_blank" rel="noreferrer">
                            <MapPin size={12} aria-hidden="true" /> {formatCoord(e.location.lat)}, {formatCoord(e.location.lng)}
                          </a>
                        )}
                      </div>
                      <span className="badge timeline__tag">{meta.label}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          <p className="muted small center">
            <HistoryIcon size={13} aria-hidden="true" /> Showing {data.events.length} event{data.events.length === 1 ? '' : 's'}
          </p>
        </Card>
      )}
    </div>
  );
}
