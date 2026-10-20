import { useMemo, useState } from 'react';
import { ArrowDownUp, Archive, Pencil, Plus, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageHeading, EmptyState, Loading, Modal, SearchBox } from '../components/ui';
import { FINE_RULES, type FineCategory } from '../constants/fineRules';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usePublicPlayers, useFines, usePayments } from '../hooks/useFirestore';
import { savePlayer, setPlayerActive } from '../services/playerService';
import { dateLabel, euros, playerName, userFacingError } from '../lib/utils';
import type { Fine, PublicPlayer } from '../types';
import { PaymentForm } from './Payments';
import { FineForm } from './Fines';

export function Players() {
  const { isAdmin } = useAuth();
  const { data: players, loading, error } = usePublicPlayers();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('remainingTotal');
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<PublicPlayer | null>(null);
  const [adding, setAdding] = useState(false);
  const ordered = useMemo(() => players.filter((p) => (p.active || p.fineTotal > 0 || p.remainingTotal > 0 || (isAdmin && showInactive)) && playerName(p).toLocaleLowerCase('it').includes(search.toLocaleLowerCase('it'))).toSorted((a, b) => sort === 'name' ? playerName(a).localeCompare(playerName(b), 'it') : (b[sort as 'remainingTotal' | 'fineTotal' | 'fineCount'] - a[sort as 'remainingTotal' | 'fineTotal' | 'fineCount'])), [players, search, sort, showInactive, isAdmin]);
  return <>
    <PageHeading eyebrow="ROSA · 2026/27" title="Giocatori" description="Situazione contabile individuale della squadra." action={isAdmin && <button className="button button-primary" onClick={() => setAdding(true)}><Plus size={17} /> Aggiungi giocatore</button>} />
    <div className="toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Cerca un giocatore…" /><label className="sort-label"><ArrowDownUp size={16} /><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="remainingTotal">Ordina: debito</option><option value="fineTotal">Ordina: totale multe</option><option value="fineCount">Ordina: numero sanzioni</option><option value="name">Ordina: nome</option></select></label>{isAdmin && <label className="check-inline"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} /> Mostra archiviati</label>}</div>
    {error && <div className="inline-error">Impossibile caricare i giocatori: {error}</div>}
    {loading ? <Loading /> : ordered.length ? <div className="player-card-grid">{ordered.map((player) => <article className={`player-card ${!player.active ? 'player-inactive' : ''}`} key={player.id}><div className="player-card-top"><div className="avatar avatar-large">{player.name.slice(0, 1)}{player.surname.slice(0, 1)}</div><div className="player-title"><Link to={`/players/${player.id}`}><h3>{playerName(player)}</h3></Link><span>{player.shirtNumber ? `Maglia n. ${player.shirtNumber}` : player.active ? 'Giocatore attivo' : 'Archiviato'}</span></div><span className={`player-state ${player.active ? 'state-active' : ''}`}>{player.active ? 'Attivo' : 'Archiviato'}</span></div><div className="player-card-metrics"><div><small>Multe</small><strong>{euros(player.fineTotal)}</strong></div><div><small>Pagato</small><strong className="paid-value">{euros(player.paidTotal)}</strong></div><div><small>Residuo</small><strong className={player.remainingTotal > 0 ? 'debt-value' : ''}>{euros(player.remainingTotal)}</strong></div></div><div className="player-card-footer"><span>{player.fineCount} multe economiche</span><div><Link className="text-link" to={`/players/${player.id}`}>Profilo <span aria-hidden="true">→</span></Link>{isAdmin && <button className="icon-button" onClick={() => setEditing(player)} aria-label={`Modifica ${playerName(player)}`}><Pencil size={16} /></button>}</div></div></article>)}</div> : <EmptyState title={search ? 'Nessun risultato' : 'Configura la rosa'} body={search ? 'Prova a cambiare la ricerca.' : 'Aggiungi manualmente i giocatori della stagione. Non sono stati inseriti nomi di esempio.'} icon={<Users />} />}
    {adding && <PlayerForm onClose={() => setAdding(false)} onSaved={() => setAdding(false)} />}
    {editing && <PlayerForm player={editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
  </>;
}

function PlayerForm({ player, onClose, onSaved }: { player?: PublicPlayer; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(player?.name ?? '');
  const [surname, setSurname] = useState(player?.surname ?? '');
  const [shirt, setShirt] = useState(player?.shirtNumber?.toString() ?? '');
  const [busy, setBusy] = useState(false);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      await savePlayer({ id: player?.id, name, surname, shirtNumber: shirt ? Number(shirt) : undefined, active: player?.active ?? true });
      toast(player ? 'Giocatore aggiornato.' : 'Giocatore aggiunto.'); onSaved();
    } catch (cause) { toast(userFacingError(cause, 'Salvataggio non riuscito.'), 'error'); }
    finally { setBusy(false); }
  };
  const toggle = async () => {
    if (!player) return;
    const phrase = player.active ? 'Archiviare questo giocatore? Lo storico resta disponibile.' : 'Riattivare questo giocatore?';
    if (!window.confirm(phrase)) return;
    setBusy(true);
    try { await setPlayerActive(player, !player.active); toast(player.active ? 'Giocatore archiviato.' : 'Giocatore riattivato.'); onSaved(); }
    catch (cause) { toast(userFacingError(cause, 'Operazione non riuscita.'), 'error'); }
    finally { setBusy(false); }
  };
  return <Modal title={player ? 'Modifica giocatore' : 'Aggiungi giocatore'} onClose={onClose}>
    <form className="form-stack" onSubmit={(event) => void save(event)}><div className="form-two"><label className="field"><span>Nome</span><input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome" /></label><label className="field"><span>Cognome</span><input required value={surname} onChange={(event) => setSurname(event.target.value)} placeholder="Cognome" /></label></div><label className="field field-short"><span>Numero di maglia <small>facoltativo</small></span><input type="number" min="0" max="99" value={shirt} onChange={(event) => setShirt(event.target.value)} placeholder="—" /></label><div className="form-actions">{player && <button type="button" className="button button-quiet" disabled={busy} onClick={() => void toggle()}><Archive size={16} />{player.active ? 'Archivia' : 'Riattiva'}</button>}<span className="action-spacer" /><button type="button" className="button button-outline" onClick={onClose}>Annulla</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Salvataggio…' : 'Salva giocatore'}</button></div></form>
  </Modal>;
}

export function PlayerDetail() {
  const { id = '' } = useParams();
  const { isAdmin } = useAuth();
  const { data: players, loading: playersLoading } = usePublicPlayers();
  const { data: fines, loading: finesLoading } = useFines(isAdmin);
  const { data: payments, loading: paymentsLoading } = usePayments(isAdmin);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedFine, setSelectedFine] = useState<Fine | null>(null);
  const player = players.find((item) => item.id === id);
  const playerFines = fines.filter((fine) => fine.playerId === id && !fine.voidedAt).toSorted((a, b) => b.date.toMillis() - a.date.toMillis());
  const playerPayments = payments.filter((payment) => payment.playerId === id && !payment.canceledAt).toSorted((a, b) => b.date.toMillis() - a.date.toMillis());
  const historyItems = [
    ...playerFines.map((fine) => ({ id: fine.id, date: fine.date, kind: 'fine' as const, label: FINE_RULES[fine.category as FineCategory]?.label ?? fine.category, note: fine.description, amount: fine.finalAmount, paid: fine.paidAmount, remaining: fine.remainingAmount, baseAmount: fine.baseAmount, multiplier: fine.multiplier, status: fine.finalAmount === 0 ? 'PASTRY' : fine.status, fine })),
    ...playerPayments.map((payment) => ({ id: payment.id, date: payment.date, kind: 'payment' as const, label: 'Pagamento registrato', note: payment.note, amount: payment.amount, paid: payment.amount, remaining: 0, baseAmount: undefined, multiplier: undefined, status: 'PAYMENT' as const, fine: undefined })),
  ].toSorted((a, b) => b.date.toMillis() - a.date.toMillis());
  if (playersLoading) return <Loading />;
  if (!player) return <><PageHeading title="Giocatore non trovato" /><EmptyState title="Profilo non disponibile" body="Il giocatore potrebbe essere stato rimosso oppure il collegamento non è corretto." icon={<Users />} /></>;
  return <>
    <PageHeading eyebrow="PROFILO GIOCATORE" title={playerName(player)} description={player.shirtNumber !== undefined ? `Numero di maglia ${player.shirtNumber}` : 'Stagione 2026/27'} action={isAdmin && <button className="button button-primary" disabled={!player.remainingTotal} onClick={() => setPaymentOpen(true)}><Plus size={17} /> Registra pagamento</button>} />
    <div className="metric-grid profile-metrics"><MetricSmall label="Totale multe" value={euros(player.fineTotal)} /><MetricSmall label="Totale pagato" value={euros(player.paidTotal)} green /><MetricSmall label="Da pagare" value={euros(player.remainingTotal)} amber /></div>
    <section className="panel detail-panel"><div className="panel-heading"><div><div className="eyebrow">STAGIONE 2026/27</div><h2>Storico {isAdmin ? 'completo' : 'contabile'}</h2></div></div>
      {isAdmin ? (finesLoading || paymentsLoading ? <Loading /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Data</th><th>Movimento</th><th>Infrazione / nota</th><th className="align-right">Base</th><th className="align-right">Finale</th><th className="align-right">Pagato</th><th className="align-right">Residuo</th><th>Stato</th></tr></thead><tbody>{historyItems.map((item) => <tr key={item.id}><td>{dateLabel(item.date)}</td><td><span className={`movement-tag ${item.kind}`}>{item.kind === 'fine' ? 'Multa' : 'Pagamento'}</span></td><td>{item.fine ? <button className="table-link" onClick={() => setSelectedFine(item.fine!)}>{item.label}</button> : <strong>{item.label}</strong>}{item.note && <small className="table-subtext">{item.note}</small>}</td><td className="align-right">{item.kind === 'fine' && item.amount > 0 ? `${euros(item.baseAmount ?? 0)} ×${item.multiplier}` : '—'}</td><td className={`align-right ${item.kind === 'payment' ? 'paid-value' : ''}`}>{item.kind === 'payment' ? '−' : ''}{item.amount === 0 ? '—' : euros(item.amount)}</td><td className="align-right paid-value">{item.paid === 0 ? '—' : euros(item.paid)}</td><td className="align-right debt-value">{item.kind === 'fine' && item.remaining > 0 ? euros(item.remaining) : '—'}</td><td>{item.kind === 'payment' ? 'Ricevuto' : item.status === 'PASTRY' ? 'Solo paste' : item.status === 'PAID' ? 'Pagata' : item.status === 'PARTIAL' ? 'Parziale' : 'Da pagare'}</td></tr>)}</tbody></table></div>) : <div className="public-profile-summary"><span>{player.fineCount} multe economiche</span><span>Multe {euros(player.fineTotal)}</span><span>Pagato {euros(player.paidTotal)}</span><strong>Residuo {euros(player.remainingTotal)}</strong></div>}
      {isAdmin && !playerFines.length && !playerPayments.length && !finesLoading && <EmptyState title="Nessun movimento" body="Multe e pagamenti compariranno qui." />}
    </section>
    {paymentOpen && <PaymentForm player={player} onClose={() => setPaymentOpen(false)} onSaved={() => setPaymentOpen(false)} />}
    {selectedFine && <FineForm fine={selectedFine} onClose={() => setSelectedFine(null)} onSaved={() => setSelectedFine(null)} />}
  </>;
}

function MetricSmall({ label, value, green, amber }: { label: string; value: string; green?: boolean; amber?: boolean }) { return <div className="metric-card small-metric"><span>{label}</span><strong className={green ? 'paid-value' : amber ? 'debt-value' : ''}>{value}</strong></div>; }
