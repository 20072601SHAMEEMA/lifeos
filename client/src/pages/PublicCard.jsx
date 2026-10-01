import { useParams } from 'react-router-dom';
import { Droplet, Lock, Phone, PhoneCall, ShieldAlert } from 'lucide-react';
import { Avatar, ErrorState, LoadingState } from '../components/ui.jsx';
import { LogoMark } from '../components/Brand.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { cardService } from '../services/index.js';
import { formatDateTime, telHref } from '../utils/format.js';

/** Page opened by scanning the QR code. No login required; shows only owner-approved fields. */
export default function PublicCard() {
  useDocumentTitle('Emergency information');
  const { shareId } = useParams();
  const { data, loading, error } = useAsync(() => cardService.getPublic(shareId), [shareId]);

  return (
    <div className="public-card">
      <div className="public-card__inner">
        {loading ? (
          <LoadingState label="Loading emergency information…" />
        ) : error ? (
          <div className="ecard ecard--public">
            <ErrorState error={error.status === 404 ? new Error('This emergency card is not available. The owner may have turned off sharing.') : error} />
          </div>
        ) : (
          <article className="ecard ecard--public">
            <div className="ecard__head">
              <span className="ecard__badge">
                <ShieldAlert size={14} aria-hidden="true" /> EMERGENCY INFORMATION
              </span>
            </div>
            <div className="ecard__id">
              <Avatar name={data.name} photo={data.photo} size={72} />
              <div>
                <h1>{data.name}</h1>
                {data.bloodGroup && (
                  <span className="blood-chip">
                    <Droplet size={13} aria-hidden="true" /> Blood group {data.bloodGroup}
                  </span>
                )}
              </div>
            </div>

            {data.emergencyContact && (
              <a className="public-call" href={telHref(data.emergencyContact.phone)}>
                <Phone size={20} aria-hidden="true" />
                <span>
                  <small>Call emergency contact</small>
                  <strong>
                    {data.emergencyContact.name} ({data.emergencyContact.relationship})
                  </strong>
                  <span className="mono">{data.emergencyContact.phone}</span>
                </span>
              </a>
            )}
            {data.emergencyPhone && (
              <a className="public-call public-call--danger" href={telHref(data.emergencyPhone)}>
                <PhoneCall size={20} aria-hidden="true" />
                <span>
                  <small>Emergency number</small>
                  <strong className="mono">{data.emergencyPhone}</strong>
                </span>
              </a>
            )}

            <dl className="ecard__fields">
              {data.allergies && (
                <div>
                  <dt>Allergies</dt>
                  <dd>{data.allergies}</dd>
                </div>
              )}
              {data.conditions && (
                <div>
                  <dt>Medical conditions</dt>
                  <dd>{data.conditions}</dd>
                </div>
              )}
              {data.medications && (
                <div>
                  <dt>Medications</dt>
                  <dd>{data.medications}</dd>
                </div>
              )}
              {data.notes && (
                <div>
                  <dt>Important information</dt>
                  <dd>{data.notes}</dd>
                </div>
              )}
            </dl>
            <p className="public-card__foot">
              <Lock size={13} aria-hidden="true" /> Shared by the owner via LifeOS · updated {formatDateTime(data.updatedAt)}
            </p>
          </article>
        )}
        <p className="public-card__brand">
          <LogoMark size={20} /> LifeOS — in a life-threatening emergency, call your local emergency number.
        </p>
      </div>
    </div>
  );
}
