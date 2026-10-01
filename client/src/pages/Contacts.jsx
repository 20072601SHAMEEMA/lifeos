import { useMemo, useState } from 'react';
import { Mail, Pencil, Phone, Plus, Search, Star, Trash2, UserPlus, Users } from 'lucide-react';
import { Avatar, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Segmented, Skeleton, Spinner } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { contactService } from '../services/index.js';
import { telHref } from '../utils/format.js';
import { validateContact } from '../utils/validators.js';

const EMPTY = { name: '', relationship: '', phone: '', email: '', priority: 'medium', isPrimary: false };
const RELATIONSHIPS = ['Mother', 'Father', 'Sister', 'Brother', 'Spouse', 'Partner', 'Friend', 'Best friend', 'Roommate', 'Colleague', 'Guardian', 'Doctor'];
const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

function ContactForm({ initial, onSubmit, onCancel, busy, serverErrors }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const allErrors = { ...serverErrors, ...errors };

  const set = (key) => (e) => {
    const value = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  return (
    <form
      id="contact-form"
      className="form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const errs = validateContact(form);
        setErrors(errs);
        if (!Object.keys(errs).length) onSubmit({ ...form, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() });
      }}
    >
      <div className="form-grid">
        <Field label="Name" error={allErrors.name} required>
          {(p) => <input {...p} className="input" value={form.name} onChange={set('name')} placeholder="e.g. Mother" autoComplete="off" />}
        </Field>
        <Field label="Relationship" error={allErrors.relationship} required>
          {(p) => (
            <>
              <input {...p} className="input" list="relationships" value={form.relationship} onChange={set('relationship')} placeholder="e.g. Mother, Friend" />
              <datalist id="relationships">
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </>
          )}
        </Field>
      </div>
      <div className="form-grid">
        <Field label="Phone number" error={allErrors.phone} required>
          {(p) => <input {...p} className="input" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />}
        </Field>
        <Field label="Email" error={allErrors.email} hint="Optional">
          {(p) => <input {...p} className="input" type="email" value={form.email} onChange={set('email')} placeholder="name@example.com" />}
        </Field>
      </div>
      <Field label="Priority">
        {() => <Segmented label="Priority" options={PRIORITY_OPTIONS} value={form.priority} onChange={set('priority')} />}
      </Field>
      {!initial.id && (
        <label className="checkbox">
          <input type="checkbox" checked={form.isPrimary} onChange={set('isPrimary')} />
          <span>Make this my primary emergency contact</span>
        </label>
      )}
      <div className="modal__foot modal__foot--inline">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn--primary" disabled={busy}>
          {busy && <Spinner size={16} />} {initial.id ? 'Save changes' : 'Add contact'}
        </button>
      </div>
    </form>
  );
}

export default function Contacts() {
  useDocumentTitle('Emergency Contacts');
  const toast = useToast();
  const { data: contacts, loading, error, reload, setData } = useAsync(() => contactService.list());
  const [editing, setEditing] = useState(null); // null | contact | EMPTY
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts || [];
    return (contacts || []).filter((c) => [c.name, c.relationship, c.phone, c.email].some((v) => v?.toLowerCase().includes(q)));
  }, [contacts, query]);

  const openForm = (contact) => {
    setServerErrors({});
    setEditing(contact);
  };

  async function save(form) {
    setBusy(true);
    setServerErrors({});
    try {
      const res = editing.id ? await contactService.update(editing.id, form) : await contactService.create(form);
      setData(res.contacts);
      toast.success(editing.id ? 'Contact updated.' : `${form.name} added to your trusted contacts.`);
      setEditing(null);
    } catch (err) {
      setServerErrors(err.fields || {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      setData(await contactService.remove(deleting.id));
      toast.success(`${deleting.name} was removed.`);
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function makePrimary(c) {
    try {
      setData(await contactService.setPrimary(c.id));
      toast.success(`${c.name} is now your primary emergency contact.`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Trusted circle"
        title="Emergency Contacts"
        subtitle="People LifeOS puts one tap away when you need help. Your primary contact is shown first everywhere."
        actions={
          <button className="btn btn--primary" onClick={() => openForm(EMPTY)}>
            <Plus size={18} /> Add contact
          </button>
        }
      />

      {error && <ErrorState error={error} onRetry={reload} />}

      {contacts?.length > 3 && (
        <div className="search-box">
          <Search size={17} aria-hidden="true" />
          <input className="input" type="search" placeholder="Search contacts" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search contacts" />
        </div>
      )}

      {loading ? (
        <div className="contact-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card">
              <Skeleton height={48} width={48} radius={24} />
              <Skeleton height={18} width="60%" style={{ marginTop: 14 }} />
              <Skeleton height={14} width="40%" style={{ marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : !contacts?.length && !error ? (
        <EmptyState
          icon={Users}
          title="No emergency contacts yet"
          text="Add family or friends who should be reachable in an emergency. Your first contact becomes your primary contact."
          action={
            <button className="btn btn--primary" onClick={() => openForm(EMPTY)}>
              <UserPlus size={17} /> Add your first contact
            </button>
          }
        />
      ) : (
        <ul className="contact-grid">
          {filtered.map((c) => (
            <li key={c.id} className={`card contact-card ${c.isPrimary ? 'contact-card--primary' : ''}`}>
              <div className="contact-card__top">
                <Avatar name={c.name} size={50} />
                <div className="contact-card__id">
                  <h3>{c.name}</h3>
                  <p>{c.relationship}</p>
                </div>
                <button
                  className={`icon-btn star ${c.isPrimary ? 'is-on' : ''}`}
                  onClick={() => !c.isPrimary && makePrimary(c)}
                  aria-label={c.isPrimary ? `${c.name} is your primary contact` : `Make ${c.name} primary contact`}
                  aria-pressed={c.isPrimary}
                  title={c.isPrimary ? 'Primary emergency contact' : 'Mark as primary'}
                >
                  <Star size={18} />
                </button>
              </div>
              <div className="contact-card__tags">
                {c.isPrimary && <span className="badge badge--primary">Primary emergency contact</span>}
                <span className={`badge badge--prio-${c.priority}`}>{c.priority} priority</span>
              </div>
              <dl className="contact-card__info">
                <div>
                  <dt>
                    <Phone size={14} aria-label="Phone" />
                  </dt>
                  <dd className="mono">{c.phone}</dd>
                </div>
                {c.email && (
                  <div>
                    <dt>
                      <Mail size={14} aria-label="Email" />
                    </dt>
                    <dd>{c.email}</dd>
                  </div>
                )}
              </dl>
              <div className="contact-card__actions">
                <a className="btn btn--success btn--sm" href={telHref(c.phone)} aria-label={`Call ${c.name}`}>
                  <Phone size={15} /> Call
                </a>
                <button className="btn btn--ghost btn--sm" onClick={() => openForm({ ...EMPTY, ...c })} aria-label={`Edit ${c.name}`}>
                  <Pencil size={15} /> Edit
                </button>
                <button className="icon-btn icon-btn--danger" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`} title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
          {filtered.length === 0 && <li className="muted">No contacts match “{query}”.</li>}
        </ul>
      )}

      <Modal open={Boolean(editing)} onClose={() => !busy && setEditing(null)} title={editing?.id ? 'Edit contact' : 'Add emergency contact'}>
        {editing && <ContactForm key={editing.id || 'new'} initial={editing} onSubmit={save} onCancel={() => setEditing(null)} busy={busy} serverErrors={serverErrors} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete contact?"
        message={deleting ? `${deleting.name} will be removed from your emergency contacts.${deleting.isPrimary ? ' Your next highest-priority contact will become primary.' : ''}` : ''}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
