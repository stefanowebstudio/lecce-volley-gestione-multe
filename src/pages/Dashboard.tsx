import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Banknote, CalendarDays, ChartNoAxesCombined, ClipboardList, Copy, Share2, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useFines, usePublicPlayers, usePublicSummary } from '../hooks/useFirestore';
import { dateLabel, euros, playerName } from '../lib/utils';
import { PageHeading, EmptyState, Loading, StatusBadge } from '../components/ui';

export function Dashboard() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { data: summary, loading: summaryLoading, error: summaryError } = usePublicSummary();
  const { data: players, loading: playersLoading, error: playersError } = usePublicPlayers();
  const { data: fines, loading: finesLoading, error: finesError } = useFines(isAdmin);
  const [sort, setSort] = useState<'debt' | 'name'>('debt');
  const orderedPlayers = useMemo(() => players.filter((player) => player.active || player.fineTotal > 0 || player.remainingTotal > 0).toSorted((a, b) => sort === 'debt' ? b.remainingTotal - a.remainingTotal : playerName(a).localeCompare(playerName(b), 'it')), [players, sort]);
  const recent = useMemo(() => fines.filter((fine) => !fine.voidedAt).toSorted((a, b) => b.date.toMillis() - a.date.toMillis()).slice(0, 6), [fines]);
  const shareText = `LECCE VOLLEY 26/27\nSituazione multe\nTotale multe: ${euros(summary.fineTotal)}\nTotale pagato: ${euros(summary.paidTotal)}\nTotale da pagare: ${euros(summary.remainingTotal)}\n\n${orderedPlayers.map((player) => `${playerName(player)} — Totale ${euros(player.fineTotal)} · Pagato ${euros(player.paidTotal)} · Residuo ${euros(player.remainingTotal)}`).join('\n')}`;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Lecce Volley 26/27 · Situazione multe', text: shareText });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(shareText); toast('Situazione copiata negli appunti.'); }
      else { window.prompt('Copia la situazione della squadra:', shareText); }
    } catch (cause) {
      if (cause instanceof Error && cause.name !== 'AbortError') toast('Condivisione non riuscita.', 'error');
    }
  };
  const topDebtor = orderedPlayers[0];
  return <>
    <PageHeading eyebrow="LECCE VOLLEY · STAGIONE 2026/27" title="Situazione multe" description="Riepilogo aggiornato della cassa e della squadra." action={<button className="button button-outline share-button" onClick={() => void share()}><Share2 size={17} /> Condividi</button>} />
    {(playersError || finesError || summaryError) && <div className="inline-error">{playersError ?? finesError ?? summaryError}</div>}
    <section className="metric-grid">
      <Metric title="Totale multe" value={euros(summary.fineTotal)} note="Importi registrati" icon={<ClipboardList />} tint="green" loading={summaryLoading} />
      <Metric title="Totale incassato" value={euros(summary.paidTotal)} note="Pagamenti dichiarati ricevuti" icon={<Banknote />} tint="blue" loading={summaryLoading} />
      <Metric title="Da incassare" value={euros(summary.remainingTotal)} note="Debito residuo squadra" icon={<TrendingUp />} tint="amber" loading={summaryLoading} />
      <Metric title="Numero multe" value={`${summary.fineCount}`} note="Sanzioni economiche registrate" icon={<ClipboardList />} tint="neutral" loading={summaryLoading} />
    </section>
    <section className="dashboard-grid">
      <div className="panel team-panel">
        <div className="panel-heading"><div><div className="eyebrow">CONTABILITÀ INDIVIDUALE</div><h2>Situazione giocatori</h2></div><select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value as 'debt' | 'name')} aria-label="Ordina giocatori"><option value="debt">Per debito</option><option value="name">Per nome</option></select></div>
        {playersLoading ? <Loading /> : orderedPlayers.length ? <div className="team-list">{orderedPlayers.map((player, index) => <Link to={`/players/${player.id}`} className="team-row" key={player.id}><span className="rank-number">{String(index + 1).padStart(2, '0')}</span><span className="avatar">{player.name.slice(0, 1)}{player.surname.slice(0, 1)}</span><span className="team-player-name"><strong>{playerName(player)}</strong><small>{player.active ? `${player.fineCount} ${player.fineCount === 1 ? 'multa' : 'multe'}` : 'Archiviato'}</small></span><span className="team-player-total"><strong>{euros(player.remainingTotal)}</strong><small>residuo</small></span><ArrowDownRight size={17} className="row-arrow" /></Link>)}</div> : <EmptyState title="Rosa non ancora configurata" body="Gli amministratori possono aggiungere i giocatori dalla sezione Giocatori." icon={<Users />} />}
        <Link to="/players" className="panel-footer-link">Vai alla rosa <ArrowUpRight size={15} /></Link>
      </div>
      <div className="right-column">
        <div className="panel cash-panel"><div className="eyebrow">CASSA E DEBITI</div><h2>{euros(summary.remainingTotal)}</h2><p>Ancora da incassare</p><div className="cash-progress"><span style={{ width: `${summary.fineTotal ? Math.min(100, summary.paidTotal / summary.fineTotal * 100) : 0}%` }} /></div><div className="cash-progress-labels"><span>Incassato <strong>{euros(summary.paidTotal)}</strong></span><span>{summary.fineTotal ? Math.round(summary.paidTotal / summary.fineTotal * 100) : 0}%</span></div>{topDebtor && topDebtor.remainingTotal > 0 && <div className="top-debtor"><span className="top-debtor-icon"><TrendingUp size={17} /></span><span><small>Residuo più alto</small><strong>{playerName(topDebtor)}</strong></span><b>{euros(topDebtor.remainingTotal)}</b></div>}</div>
        {isAdmin && <div className="panel recent-panel"><div className="panel-heading compact"><div><div className="eyebrow">ULTIME REGISTRAZIONI</div><h2>Ultime multe</h2></div><Link to="/fines" className="text-link">Tutte</Link></div>{finesLoading ? <Loading /> : recent.length ? <div className="recent-list">{recent.map((fine) => <div className="recent-row" key={fine.id}><div className="recent-date"><strong>{dateLabel(fine.date, { day: '2-digit' })}</strong><small>{dateLabel(fine.date, { month: 'short' })}</small></div><div className="recent-info"><strong>{fine.playerName}</strong><small>{fine.category.replaceAll('_', ' ')}</small></div><div className="recent-amount"><strong>{euros(fine.finalAmount)}</strong><StatusBadge status={fine.status} /></div></div>)}</div> : <EmptyState title="Nessuna multa registrata" body="La prima registrazione comparirà qui." icon={<CalendarDays />} />}</div>}
      </div>
    </section>
    <div className="dashboard-note"><ChartNoAxesCombined size={17} /><span>Il riepilogo pubblico mostra solo nome e situazione contabile. Le note e lo storico dettagliato restano nell’area amministrativa.</span><Copy size={15} /></div>
  </>;
}

function Metric({ title, value, note, icon, tint, loading }: { title: string; value: string; note: string; icon: React.ReactNode; tint: string; loading: boolean }) {
  return <div className="metric-card"><div className={`metric-icon metric-${tint}`}>{icon}</div><div className="metric-copy"><span>{title}</span><strong>{loading ? '…' : value}</strong><small>{note}</small></div></div>;
}
