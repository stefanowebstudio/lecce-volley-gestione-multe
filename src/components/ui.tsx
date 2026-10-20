import { LoaderCircle, Search, X } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-heading-action">{action}</div>}</div>;
}

export function Loading({ label = 'Caricamento…' }: { label?: string }) {
  return <div className="loading"><LoaderCircle size={21} className="spin" /><span>{label}</span></div>;
}

export function EmptyState({ title, body, icon }: { title: string; body: string; icon?: ReactNode }) {
  return <div className="empty-state">{icon && <div className="empty-icon">{icon}</div>}<strong>{title}</strong><span>{body}</span></div>;
}

export function SearchBox({ value, onChange, placeholder = 'Cerca…' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="search-box"><Search size={17} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{value && <button className="icon-button" onClick={() => onChange('')} aria-label="Cancella"><X size={15} /></button>}</label>;
}

export function Modal({ title, children, onClose, width = '560px' }: { title: string; children: ReactNode; onClose: () => void; width?: string }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth: width }}><header className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Chiudi"><X size={19} /></button></header><div className="modal-body">{children}</div></section></div>;
}

export function StatusBadge({ status, pastry = false }: { status: string; pastry?: boolean }) {
  const label = pastry ? 'Solo paste' : status === 'PASTRY' ? 'Solo paste' : status === 'PAID' ? 'Pagata' : status === 'PARTIAL' ? 'Parziale' : status === 'UNPAID' ? 'Da pagare' : status;
  return <span className={`status-badge status-${status.toLowerCase()}`}>{label}</span>;
}
