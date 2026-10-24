import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, FlaskConical, Inbox, Loader2, RefreshCw, X } from 'lucide-react';
import { initials } from '../utils/format.js';

/* ---------- Layout helpers ---------- */

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}

export function Card({ as: Tag = 'section', className = '', children, ...rest }) {
  return (
    <Tag className={`card ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({ icon: Icon, title, action, tone = 'primary' }) {
  return (
    <div className="card-header">
      <div className="card-header__title">
        {Icon && (
          <span className={`icon-chip icon-chip--${tone}`} aria-hidden="true">
            <Icon size={18} />
          </span>
        )}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

/* ---------- Feedback states ---------- */

export function Spinner({ size = 18, label = 'Loading' }) {
  return <Loader2 className="spin" size={size} aria-label={label} role="status" />;
}

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="state state--loading" role="status">
      <Spinner size={26} />
      <p>{label}</p>
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', radius = 10, style }) {
  return <span className="skeleton" style={{ height, width, borderRadius: radius, ...style }} aria-hidden="true" />;
}

export function ErrorState({ error, onRetry, compact = false }) {
  return (
    <div className={`state state--error ${compact ? 'state--compact' : ''}`} role="alert">
      <AlertTriangle size={compact ? 18 : 26} aria-hidden="true" />
      <p>{error?.message || String(error || 'Something went wrong.')}</p>
      {onRetry && (
        <button className="btn btn--ghost btn--sm" onClick={onRetry}>
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="state state--empty">
      <span className="state__icon" aria-hidden="true">
        <Icon size={26} />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

/** Marks a feature whose real-world effect is simulated in this project. */
export function SimulatedBadge({ children = 'Simulated' }) {
  return (
    <span className="badge badge--sim" title="This feature is a simulation in the student version of LifeOS.">
      <FlaskConical size={12} aria-hidden="true" /> {children}
    </span>
  );
}

export function Notice({ tone = 'info', icon: Icon, title, children }) {
  return (
    <div className={`notice notice--${tone}`} role={tone === 'danger' ? 'alert' : 'note'}>
      {Icon && <Icon size={18} aria-hidden="true" className="notice__icon" />}
      <div>
        {title && <strong>{title}</strong>}
        <div className="notice__body">{children}</div>
      </div>
    </div>
  );
}

export function StatusPill({ tone = 'success', children, pulse = false }) {
  return (
    <span className={`pill pill--${tone}`}>
      <span className={`pill__dot ${pulse ? 'pill__dot--pulse' : ''}`} aria-hidden="true" />
      {children}
    </span>
  );
}

export function Avatar({ name, photo, size = 44 }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {photo ? <img src={photo} alt="" /> : <span aria-hidden="true">{initials(name)}</span>}
    </span>
  );
}

/* ---------- Forms ---------- */

/** `group`: the control is a button group (not an input), so the caption can't be a <label for>. */
export function Field({ label, error, hint, children, id: idProp, required, group = false, className = '' }) {
  const autoId = useId();
  const id = idProp || autoId;
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  const child = typeof children === 'function' ? children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy }) : children;
  const caption = (
    <>
      {label}
      {required && <span className="field__req" aria-hidden="true"> *</span>}
    </>
  );
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      {group ? (
        <span id={`${id}-label`} className="field__label">
          {caption}
        </span>
      ) : (
        <label htmlFor={id} className="field__label">
          {caption}
        </label>
      )}
      {child}
      {hint && !error && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  const id = useId();
  return (
    <div className="toggle-row">
      <div className="toggle-row__text">
        <label htmlFor={id} className="toggle-row__label">
          {label}
        </label>
        {description && <p className="toggle-row__desc">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`switch ${checked ? 'switch--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__thumb" />
      </button>
    </div>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`segmented__btn ${value === o.value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.icon && <o.icon size={15} aria-hidden="true" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Overlays ---------- */

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab' && ref.current) {
        const focusables = ref.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    setTimeout(() => ref.current?.querySelector('input, select, textarea, button:not(.modal__close)')?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal--${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <div className="modal__head">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn modal__close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', tone = 'danger', busy, onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className={`btn btn--${tone}`} onClick={onConfirm} disabled={busy}>
            {busy && <Spinner size={16} />} {confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  );
}
