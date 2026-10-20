import { useMemo, useState } from 'react';
import { CalendarDays, ClipboardList, Edit3, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PageHeading, EmptyState, Loading, Modal, SearchBox, StatusBadge } from '../components/ui';
import { FINE_RULES, FINE_RULE_ENTRIES, type FineCategory, type FineRule } from '../constants/fineRules';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useFines, usePlayers } from '../hooks/useFirestore';
import { calculateCategoryBase, calculateFine } from '../lib/fineCalculator';
import { dateLabel, euros, userFacingError } from '../lib/utils';
import type { CreateFineInput, Fine, PastryMode, Player } from '../types';
import { amendFine, createFines, removeFine } from '../services/fineService';

export function Fines() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { data: fines, loading, error } = useFines(isAdmin);
  const { data: players } = usePlayers(isAdmin);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [category, setCategory] = useState('all');
  const [playerFilter, setPlayerFilter] = useState('all');
  const [status, setStatus] = useState('all');
  const [matchDay, setMatchDay] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [order, setOrder] = useState('newest');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Fine | null>(null);
  const [busyId, setBusyId] = useState('');
  const visible = useMemo(() => fines.filter((fine) => !fine.voidedAt)
    .filter((fine) => !search || `${fine.playerName} ${fine.category.replaceAll('_', ' ')} ${fine.description ?? ''}`.toLocaleLowerCase('it').includes(search.toLocaleLowerCase('it')))
    .filter((fine) => category === 'all' || fine.category === category)
    .filter((fine) => playerFilter === 'all' || fine.playerId === playerFilter)
    .filter((fine) => status === 'all' || (status === 'PASTRY' ? fine.finalAmount === 0 : fine.status === status))
    .filter((fine) => matchDay === 'all' || String(fine.isMatchDay) === matchDay)
    .filter((fine) => !dateFrom || dateInput(fine.date.toDate()) >= dateFrom)
    .filter((fine) => !dateTo || dateInput(fine.date.toDate()) <= dateTo)
    .toSorted((a, b) => order === 'newest' ? b.date.toMillis() - a.date.toMillis() : order === 'oldest' ? a.date.toMillis() - b.date.toMillis() : order === 'high' ? b.finalAmount - a.finalAmount : a.finalAmount - b.finalAmount),
  [fines, search, category, playerFilter, status, matchDay, dateFrom, dateTo, order]);
  const onSearch = (value: string) => { setSearch(value); setParams(value ? { q: value } : {}); };
  const voidEntry = async (fine: Fine) => {
    if (!window.confirm(`Sei sicuro di voler annullare la multa di ${fine.playerName} (${euros(fine.finalAmount)})? L’azione verrà registrata nello storico amministrativo.`)) return;
    setBusyId(fine.id);
    try { await removeFine(fine); toast('Multa annullata.'); }
    catch (cause) { toast(userFacingError(cause, 'Annullamento non riuscito.'), 'error'); }
    finally { setBusyId(''); }
  };
  return <>
    <PageHeading eyebrow="AREA AMMINISTRATIVA" title="Storico multe" description="Registro completo delle sanzioni della stagione." action={<button className="button button-primary" onClick={() => setFormOpen(true)}><Plus size={17} /> Nuova multa</button>} />
    <div className="toolbar fines-toolbar"><SearchBox value={search} onChange={onSearch} placeholder="Cerca giocatore, infrazione o nota…" /><select className="toolbar-select" value={playerFilter} onChange={(event) => setPlayerFilter(event.target.value)} aria-label="Filtra giocatore"><option value="all">Tutti i giocatori</option>{players.map((player) => <option key={player.id} value={player.id}>{player.surname} {player.name}</option>)}</select><select className="toolbar-select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filtra categoria"><option value="all">Tutte le categorie</option>{Object.entries(FINE_RULES).map(([key, rule]) => <option key={key} value={key}>{rule.label}</option>)}</select><select className="toolbar-select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtra stato pagamento"><option value="all">Tutti gli stati</option><option value="UNPAID">Da pagare</option><option value="PARTIAL">Parziali</option><option value="PAID">Pagate</option><option value="PASTRY">Solo paste</option></select><select className="toolbar-select" value={matchDay} onChange={(event) => setMatchDay(event.target.value)} aria-label="Filtra giorno partita"><option value="all">Tutte le giornate</option><option value="true">Giorno partita</option><option value="false">Giorno normale</option></select><label className="date-filter"><span>Dal</span><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label className="date-filter"><span>Al</span><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label><select className="toolbar-select" value={order} onChange={(event) => setOrder(event.target.value)} aria-label="Ordina multe"><option value="newest">Più recenti</option><option value="oldest">Meno recenti</option><option value="high">Importo maggiore</option><option value="low">Importo minore</option></select></div>
    {error && <div className="inline-error">Errore nel caricamento dello storico: {error}</div>}
    <div className="panel table-panel">{loading ? <Loading /> : visible.length ? <div className="table-wrap"><table className="data-table fine-table"><thead><tr><th>Data</th><th>Giocatore</th><th>Infrazione</th><th>Calcolo</th><th className="align-right">Residuo</th><th>Stato</th><th><span className="sr-only">Azioni</span></th></tr></thead><tbody>{visible.map((fine) => <tr key={fine.id}><td><span className="date-cell"><CalendarDays size={15} />{dateLabel(fine.date)}</span></td><td><strong>{fine.playerName}</strong></td><td><strong>{FINE_RULES[fine.category as FineCategory]?.label ?? fine.category}</strong>{fine.pastryRequired && <small className="table-subtext">Paste {fine.pastryMode === 'IN_COPPIA' ? '· in coppia' : fine.pastryMode === 'SINGOLARMENTE' ? '· singolarmente' : 'richieste'}</small>}{fine.description && <small className="table-subtext">{fine.description}</small>}</td><td><span>{euros(fine.baseAmount)} <small>×{fine.multiplier}</small></span>{fine.isMatchDay && <small className="match-day-label">Giorno partita</small>}</td><td className="align-right"><strong>{euros(fine.remainingAmount)}</strong>{fine.remainingAmount !== fine.finalAmount && <small className="table-subtext">su {euros(fine.finalAmount)}</small>}</td><td><StatusBadge status={fine.status} pastry={fine.finalAmount === 0} /></td><td><div className="row-actions"><button className="icon-button" aria-label="Modifica multa" title="Modifica" onClick={() => setEditing(fine)}><Edit3 size={15} /></button><button className="icon-button danger-icon" aria-label="Annulla multa" title="Annulla" disabled={busyId === fine.id} onClick={() => void voidEntry(fine)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState title="Nessuna multa trovata" body={fines.length ? 'Modifica i filtri per vedere altre registrazioni.' : 'Registra la prima infrazione per iniziare lo storico.'} icon={<ClipboardList />} />}</div>
    {formOpen && <FineForm onClose={() => setFormOpen(false)} onSaved={() => setFormOpen(false)} />}
    {editing && <FineForm fine={editing} players={players} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
  </>;
}

export function FineForm({ fine, players: passedPlayers, onClose, onSaved }: { fine?: Fine; players?: Player[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const { data: loadedPlayers } = usePlayers(true);
  const players = passedPlayers ?? loadedPlayers;
  const [playerId, setPlayerId] = useState(fine?.playerId ?? '');
  const [category, setCategory] = useState<FineCategory>((fine?.category as FineCategory) ?? 'TRAINING_DELAY');
  const [minutes, setMinutes] = useState(fine?.minutes?.toString() ?? '');
  const [communicated, setCommunicated] = useState(false);
  const [addBottleViolation, setAddBottleViolation] = useState(false);
  const [description, setDescription] = useState(fine?.description ?? '');
  const [date, setDate] = useState(fine ? dateInput(fine.date.toDate()) : dateInput(new Date()));
  const [isMatchDay, setIsMatchDay] = useState(fine?.isMatchDay ?? false);
  const [pastryMode, setPastryMode] = useState<PastryMode | ''>(fine?.pastryMode ?? (fine?.category === 'EXPULSION_DISQUALIFICATION' ? 'SINGOLARMENTE' : ''));
  const [busy, setBusy] = useState(false);
  const rule: FineRule = FINE_RULES[category];
  const bottleSecond: FineCategory | '' = category === 'BOTTLE_LEFT' ? 'BOTTLE_NUMBER_MISSING' : category === 'BOTTLE_NUMBER_MISSING' ? 'BOTTLE_LEFT' : '';
  const base = calculateCategoryBase(category, Number(minutes), communicated);
  const otherBase = bottleSecond && addBottleViolation ? calculateCategoryBase(bottleSecond) : 0;
  const preview = calculateFine(base + otherBase, isMatchDay);
  const isExempt = category === 'TRAINING_DELAY' && communicated;
  const needsMinutes = category === 'TRAINING_DELAY' || category === 'MATCH_DELAY';
  const needsPastryMode = !!rule.pastries;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!fine && !playerId) { toast('Seleziona un giocatore.', 'error'); return; }
    if (needsMinutes && (!Number.isInteger(Number(minutes)) || Number(minutes) <= 0)) { toast('Inserisci minuti di ritardo interi e maggiori di zero.', 'error'); return; }
    if (needsPastryMode && !pastryMode) { toast('Indica se le paste sono singole o in coppia.', 'error'); return; }
    if (isExempt) { toast('Ritardo comunicato: la sanzione è esclusa.', 'error'); return; }
    setBusy(true);
    const selectedPlayerId = fine?.playerId ?? playerId;
    const common = {
      playerId: selectedPlayerId, description, date: new Date(`${date}T12:00:00`), isMatchDay,
      pastryRequired: !!rule.pastries, ...(pastryMode ? { pastryMode } : {}),
      ...(needsMinutes ? { minutes: Number(minutes) } : {}),
      ...(category === 'TRAINING_DELAY' ? { communicatedInAdvance: communicated } : {}),
    };
    try {
      if (fine) {
        await amendFine(fine, { ...common, category, baseAmount: base });
        toast('Multa aggiornata.');
      } else {
        const entries: CreateFineInput[] = [{ ...common, category, baseAmount: base }];
        if (bottleSecond && addBottleViolation) entries.push({ ...common, category: bottleSecond, baseAmount: calculateCategoryBase(bottleSecond), pastryRequired: false, pastryMode: undefined });
        await createFines(entries);
        toast(entries.length > 1 ? 'Multе registrate correttamente.' : 'Multa registrata correttamente.');
      }
      onSaved();
    } catch (cause) { toast(userFacingError(cause, 'Salvataggio non riuscito.'), 'error'); }
    finally { setBusy(false); }
  };
  return <Modal title={fine ? 'Modifica multa' : 'Nuova multa'} onClose={onClose} width="620px">
    <form className="form-stack fine-form" onSubmit={(event) => void save(event)}>
      {!fine && <label className="field"><span>Giocatore</span><select required autoFocus value={playerId} onChange={(event) => setPlayerId(event.target.value)}><option value="">Scegli dalla rosa…</option>{players.filter((player) => player.active).toSorted((a, b) => `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`, 'it')).map((player) => <option value={player.id} key={player.id}>{player.surname} {player.name}{player.shirtNumber ? ` · n. ${player.shirtNumber}` : ''}</option>)}</select>{!players.some((player) => player.active) && <small className="field-hint">Prima aggiungi i giocatori dalla sezione Giocatori.</small>}</label>}
      <label className="field"><span>Infrazione</span><select value={category} onChange={(event) => { const next = event.target.value as FineCategory; const nextRule: FineRule = FINE_RULES[next]; setCategory(next); setMinutes(''); setAddBottleViolation(false); if (next === 'EXPULSION_DISQUALIFICATION') setPastryMode('SINGOLARMENTE'); else if (!nextRule.pastries) setPastryMode(''); }}><optgroup label="Importo calcolato">{FINE_RULE_ENTRIES.filter(([, item]) => item.kind === 'CALCULATED').map(([key, item]) => <option value={key} key={key}>{item.label}</option>)}</optgroup><optgroup label="Multa prevista dal regolamento">{FINE_RULE_ENTRIES.filter(([, item]) => item.kind === 'FIXED').map(([key, item]) => <option value={key} key={key}>{item.label} · €{item.amount ?? 0}</option>)}</optgroup><optgroup label="Paste senza importo automatico">{FINE_RULE_ENTRIES.filter(([, item]) => item.kind === 'PASTRY').map(([key, item]) => <option value={key} key={key}>{item.label}</option>)}</optgroup></select><small className="field-hint">{rule.description}</small></label>
      {needsMinutes && <label className="field"><span>Minuti di ritardo</span><input type="number" min="1" step="1" required value={minutes} onChange={(event) => setMinutes(event.target.value)} placeholder="es. 12" inputMode="numeric" /></label>}
      {category === 'TRAINING_DELAY' && <label className="switch-row"><input type="checkbox" checked={communicated} onChange={(event) => setCommunicated(event.target.checked)} /><span className="switch-visual" /><span><strong>Ritardo comunicato entro un’ora</strong><small>Escluso dalla sanzione secondo il regolamento.</small></span></label>}
      {bottleSecond && <label className="check-card"><input type="checkbox" checked={addBottleViolation} onChange={(event) => setAddBottleViolation(event.target.checked)} /><span><strong>Aggiungi anche: {FINE_RULES[bottleSecond].label}</strong><small>Le due infrazioni restano separate nello storico.</small></span><b>+€2</b></label>}
      {needsPastryMode && (category === 'EXPULSION_DISQUALIFICATION' ? <div className="field"><span>Modalità paste</span><div className="locked-value">Singolarmente · previsto dal regolamento</div></div> : <label className="field"><span>Modalità paste</span><select value={pastryMode} onChange={(event) => setPastryMode(event.target.value as PastryMode | '')}><option value="">Scegli…</option><option value="SINGOLARMENTE">Singolarmente</option><option value="IN_COPPIA">In coppia</option></select></label>)}
      <div className="form-two"><label className="field"><span>Data</span><input type="date" value={date} required onChange={(event) => setDate(event.target.value)} /></label><label className="switch-row match-switch"><input type="checkbox" checked={isMatchDay} onChange={(event) => setIsMatchDay(event.target.checked)} /><span className="switch-visual" /><span><strong>Giorno della partita</strong><small>Raddoppio solo sulla parte economica</small></span></label></div>
      <label className="field"><span>Descrizione / nota <small>facoltativa</small></span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder={category === 'PASTRY_EVENT' ? 'es. compleanno, esordio…' : 'Aggiungi un dettaglio utile'} /></label>
      {fine && <div className="payment-due"><div><span>Importo registrato</span><strong>{euros(fine.finalAmount)}</strong></div><div><span>Già pagato</span><strong className="paid-value">{euros(fine.paidAmount)}</strong></div><div><span>Residuo</span><strong className="debt-value">{euros(fine.remainingAmount)}</strong></div></div>}
      <div className={`fine-preview ${isExempt ? 'preview-exempt' : ''}`}><div><small>{isExempt ? 'ESENZIONE' : 'IMPORTO BASE'}</small><strong>{euros(base + otherBase)}</strong></div><span className="preview-times">×{isMatchDay ? 2 : 1}</span><div className="preview-total"><small>{isExempt ? 'NESSUNA MULTA' : 'IMPORTO FINALE'}</small><strong>{isExempt ? '€0,00' : euros(preview.finalAmount)}</strong></div></div>
      {rule.kind === 'PASTRY' && <div className="pastry-callout"><span>🥐</span><p>Voce esclusivamente in paste: non viene generata alcuna multa economica.</p></div>}
      <div className="form-actions"><span className="action-spacer" /><button type="button" className="button button-outline" onClick={onClose}>Annulla</button><button type="submit" className="button button-primary" disabled={busy || isExempt || (!fine && !players.some((player) => player.active))}>{busy ? 'Salvataggio…' : fine ? 'Salva modifiche' : 'Registra multa'}</button></div>
    </form>
  </Modal>;
}

function dateInput(date: Date) { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 10); }
