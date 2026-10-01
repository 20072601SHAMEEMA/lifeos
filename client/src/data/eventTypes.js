import { CheckCircle2, Flag, MapPin, Navigation, PhoneCall, Siren, ShieldCheck, Timer, UserPlus, Users, XCircle, Sparkles, Activity } from 'lucide-react';

/** Visual metadata for every safety-history event type returned by the API. */
export const EVENT_META = {
  checkin: { icon: CheckCircle2, tone: 'success', label: 'Check-in' },
  journey_start: { icon: Navigation, tone: 'primary', label: 'Journey' },
  arrived: { icon: Flag, tone: 'success', label: 'Arrival' },
  journey_cancel: { icon: XCircle, tone: 'neutral', label: 'Journey' },
  journey_extend: { icon: Timer, tone: 'warning', label: 'Journey' },
  sos: { icon: Siren, tone: 'danger', label: 'SOS' },
  sos_resolved: { icon: ShieldCheck, tone: 'success', label: 'SOS' },
  location_shared: { icon: MapPin, tone: 'primary', label: 'Location' },
  contacts_alerted: { icon: Users, tone: 'warning', label: 'Alert' },
  call: { icon: PhoneCall, tone: 'danger', label: 'Call' },
  contact: { icon: UserPlus, tone: 'violet', label: 'Contacts' },
  account: { icon: Sparkles, tone: 'violet', label: 'Account' },
  default: { icon: Activity, tone: 'neutral', label: 'Event' },
};
