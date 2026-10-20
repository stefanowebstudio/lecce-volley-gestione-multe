import { useMemo, useState } from 'react';
import { Banknote, CircleDollarSign, Plus, ReceiptText, RotateCcw } from 'lucide-react';
import { PageHeading, EmptyState, Loading, Modal, SearchBox } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { usePayments, usePublicPlayers, usePublicSummary } from '../hooks/useFirestore';
import { dateLabel, euros, playerName, userFacingError } from '../lib/utils';
import type { Payment, PublicPlayer } from '../types';
import { cancelPayment } from '../services/fineService';
import { registerPayment } from '../services/paymentService';

export function Payments() {
  const toast = useToast();
  const { data: payments, loading, error } = usePayments();
  const { data: players } = usePublicPlayers();
  const { data: summary, error: summaryError } = usePublicSummary();
  const [search, setSearch] = useState('');
  const [includeCanceled, setIncludeCanceled] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const rows = useMemo(() => payments.filter((payment) => (includeCanceled || !payment.canceledAt) && `${payment.playerName} ${payment.note ?? ''}`.toLocaleLowerCase('it').includes(search.toLocaleLowerCase('it'))).toSorted((a, b) => b.date.toMillis() - a.date.toMillis()), [payments, includeCanceled, search]);
  const cancel = async (payment: Payment) => {
    if (payment.canceledAt) return;
    if (!window.confirm(`Annullare il pagamento di ${euros(payment.amount)} registrato per ${payment.playerName}? L’operazione verrà aggiunta all’audit log.`)) return;
    setBusy(payment.id);
    try { await cancelPayment(payment); toast('Pagamento annullato; debiti ricalcolati.'); }
    catch (cause) { toast(userFacingError(cause, 'Annullamento non riuscito.'), 'error'); }
    finally { setBusy(''); }
  };
  return <>
    <PageHeading eyebrow="CASSA · MOVIMENTI" title="Pagamenti" description="Registra solo gli importi effettivamente dichiarati come ricevuti." action={<button className="button button-primary" onClick={() => setFormOpen(true)}><Plus size={17} /> Registra pagamento</button>} />
    <div className="metric-grid payment-metrics"><div className="metric-card"><div className="metric-icon metric-green"><CircleDollarSign /></div><div className="metric-copy"><span>Totale multe</span><strong>{euros(summary.fineTotal)}</strong></div></div><div className="metric-card"><div className="metric-icon metric-blue"><Banknote /></div><div className="metric-copy"><span>Incassato davvero</span><strong>{euros(summary.paidTotal)}</strong></div></div><div className="metric-card"><div className="metric-icon metric-amber"><ReceiptText /></div><div className="metric-copy"><span>Ancora da incassare</span><strong>{euros(summary.remainingTotal)}</strong></div></div></div>
    {summaryError && <div className="inline-error">{summaryError}</div>}
    <div className="toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Cerca giocatore o nota…" /><label className="check-inline"><input type="checkbox" checked={includeCanceled} onChange={(event) => setIncludeCanceled(event.target.checked)} /> Mostra annullati</label></div>
    {error && <div className="inline-error">Errore nel caricamento: {error}</div>}
    <div className="panel table-panel">{loading ? <Loading /> : rows.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Data</th><th>Giocatore</th><th>Nota</th><th>Importo ricevuto</th><th>Stato</th><th><span className="sr-only">Azioni</span></th></tr></thead><tbody>{rows.map((payment) => <tr key={payment.id} className={payment.canceledAt ? 'row-canceled' : ''}><td>{dateLabel(payment.date)}</td><td><strong>{payment.playerName}</strong></td><td>{payment.note || '—'}</td><td><strong>{euros(payment.amount)}</strong></td><td><span className={`status-badge ${payment.canceledAt ? 'status-unpaid' : 'status-paid'}`}>{payment.canceledAt ? 'Annullato' : 'Ricevuto'}</span></td><td>{!payment.canceledAt && <button className="icon-button danger-icon" title="Annulla pagamento" aria-label="Annulla pagamento" disabled={busy === payment.id} onClick={() => void cancel(payment)}><RotateCcw size={16} /></button>}</td></tr>)}</tbody></table></div> : <EmptyState title="Nessun pagamento registrato" body="I pagamenti registrati compariranno qui e aggiorneranno il debito residuo." icon={<Banknote />} />}</div>
    {formOpen && <PaymentForm players={players} onClose={() => setFormOpen(false)} onSaved={() => setFormOpen(false)} />}
  </>;
}

export function PaymentForm({ player, players: passedPlayers, onClose, onSaved }: { player?: PublicPlayer; players?: PublicPlayer[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const { data: loadedPlayers } = usePublicPlayers();
  const players = passedPlayers ?? loadedPlayers;
  const [playerId, setPlayerId] = useState(player?.id ?? '');
  const selected = players.find((item) => item.id === playerId);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(dateInput(new Date()));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await registerPayment({ playerId, amount: Number(amount), date: new Date(`${date}T12:00:00`), note });
      toast('Pagamento registrato.'); onSaved();
    } catch (cause) { toast(userFacingError(cause, 'Pagamento non riuscito.'), 'error'); }
    finally { setBusy(false); }
  };
  const over = !!selected && Number(amount) > selected.remainingTotal;
  return <Modal title="Registra pagamento" onClose={onClose}>
    <form className="form-stack" onSubmit={(event) => void save(event)}>
      {!player && <label className="field"><span>Giocatore</span><select autoFocus required value={playerId} onChange={(event) => { setPlayerId(event.target.value); setAmount(''); }}><option value="">Scegli dalla rosa…</option>{players.filter((item) => item.active && item.remainingTotal > 0).toSorted((a, b) => playerName(a).localeCompare(playerName(b), 'it')).map((item) => <option value={item.id} key={item.id}>{playerName(item)} · residuo {euros(item.remainingTotal)}</option>)}</select></label>}
      {selected && <div className="payment-due"><div><span>Debito residuo</span><strong>{euros(selected.remainingTotal)}</strong></div><div><span>Già pagato</span><strong className="paid-value">{euros(selected.paidTotal)}</strong></div></div>}
      <label className="field"><span>Importo ricevuto</span><div className="currency-input"><span>€</span><input required type="number" min="0.01" max={selected?.remainingTotal} step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" /></div>{over && <small className="field-error">Il pagamento non può superare il debito residuo.</small>}</label>
      <label className="field"><span>Data</span><input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label className="field"><span>Nota <small>facoltativa</small></span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="es. Pagato in contanti" /></label>
      <div className="form-actions"><span className="action-spacer" /><button type="button" className="button button-outline" onClick={onClose}>Annulla</button><button type="submit" className="button button-primary" disabled={busy || over || !playerId || !amount}>{busy ? 'Registrazione…' : 'Conferma pagamento'}</button></div>
    </form>
  </Modal>;
}

function dateInput(date: Date) { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 10); }
