import { AlertCircle, CheckCircle2, ChevronRight, Info, LockKeyhole, X } from 'lucide-react';
import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type ReactElement,
} from 'react';
import { statusLabels, toneForStatus, type StatusTone } from '../data/atlas';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive';
}) {
  return <button className={`button button--${variant} ${className}`} {...props} />;
}

export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

export function Panel({
  title,
  action,
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { title?: string; action?: ReactNode }) {
  return (
    <section className={`panel ${className}`} {...props}>
      {(title || action) && (
        <header className="panel__header">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatusBadge({ status, tone }: { status: string; tone?: StatusTone }) {
  const resolvedTone = tone ?? toneForStatus(status);
  return (
    <span className={`badge badge--${resolvedTone}`}>
      <span className="badge__dot" aria-hidden="true" />
      {statusLabels[status] ?? status}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  status,
  context,
  contextTone,
  onClick,
}: {
  label: string;
  value: string;
  unit?: string;
  status?: string;
  context?: string;
  contextTone?: 'critical' | 'success' | 'neutral';
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">
        {value} {unit && <small>{unit}</small>}
      </span>
      <span className="kpi__footer">
        {status && <StatusBadge status={status} />}
        {context && (
          <span className={contextTone ? `kpi__context--${contextTone}` : undefined}>
            {context}
          </span>
        )}
      </span>
    </>
  );
  return onClick ? (
    <button className="panel kpi kpi--interactive" onClick={onClick}>
      {content}
    </button>
  ) : (
    <article className="panel kpi">{content}</article>
  );
}

export function PageHeader({
  title,
  description,
  controls,
}: {
  title: string;
  description?: string;
  controls?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {controls && <div className="page-header__controls">{controls}</div>}
    </header>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string; 'aria-describedby'?: string }>, {
        id,
        'aria-describedby': error ? errorId : undefined,
      })
    : children;
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <div>{control}</div>
      {error && (
        <small className="field__error" id={errorId}>
          {error}
        </small>
      )}
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="select-control">
      <span className="sr-only">{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SegmentedControl({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          className={option === value ? 'is-active' : ''}
          onClick={() => onChange(option)}
          aria-pressed={option === value}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function DetailTabs<T extends string>({
  label,
  value,
  onChange,
  tabs,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  tabs: readonly { id: T; label: string }[];
}) {
  return (
    <div className="review-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === value}
          className={tab.id === value ? 'is-active' : ''}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function DataTable({
  headers,
  rows,
  caption,
  onRowClick,
}: {
  headers: string[];
  rows: ReactNode[][];
  caption: string;
  onRowClick?: (index: number) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className={onRowClick ? 'is-clickable' : ''}
              onClick={() => onRowClick?.(index)}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onRowClick?.(index);
                }
              }}
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Drawer({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    (focusable ?? dialog)?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab' || !dialog) return;
      const items = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      previousFocus.current?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="overlay" role="presentation" onMouseDown={onClose}>
      <aside
        ref={dialogRef}
        tabIndex={-1}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <IconButton label="Close drawer" onClick={onClose}>
            <X />
          </IconButton>
        </header>
        <div className="drawer__body">{children}</div>
      </aside>
    </div>
  );
}

export function Modal({
  title,
  open,
  onClose,
  children,
  footer,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    (focusable ?? dialog)?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab' || !dialog) return;
      const items = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      previousFocus.current?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="overlay" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <IconButton label="Close modal" onClick={onClose}>
            <X />
          </IconButton>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </section>
    </div>
  );
}

type ToastTone = 'success' | 'information' | 'warning';
const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const showToast = (message: string, tone: ToastTone = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  };
  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className={`toast toast--${toast.tone}`} role="status">
          <CheckCircle2 aria-hidden="true" />
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export function StateView({
  type,
  title,
  message,
  action,
}: {
  type: 'loading' | 'empty' | 'error' | 'no-access' | 'locked';
  title: string;
  message: string;
  action?: ReactNode;
}) {
  const Icon =
    type === 'error' || type === 'no-access' ? AlertCircle : type === 'locked' ? LockKeyhole : Info;
  return (
    <section
      className={`state-view state-view--${type}`}
      aria-live={type === 'loading' ? 'polite' : undefined}
    >
      <Icon aria-hidden="true" />
      <h1>{title}</h1>
      <p>{message}</p>
      {action}
    </section>
  );
}

export function DetailLink({
  children = 'View details',
  onClick,
}: {
  children?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button className="detail-link" onClick={onClick}>
      {children}
      <ChevronRight aria-hidden="true" />
    </button>
  );
}
