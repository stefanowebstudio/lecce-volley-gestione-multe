import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, ClipboardList, TrendingUp, Users } from 'lucide-react';
import { PageHeading, EmptyState, Loading } from '../components/ui';
import { FINE_RULES, type FineCategory } from '../constants/fineRules';
import { useFines, usePayments, usePublicPlayers, usePublicSummary } from '../hooks/useFirestore';
import { euros, playerName } from '../lib/utils';

const COLORS = ['#74bd6b', '#d5a457', '#5992d5', '#a684ce', '#df7e73', '#5db2a6', '#b0b77a'];

export function Statistics() {
  const { data: fines, loading: finesLoading } = useFines();
  const { data: payments, loading: paymentsLoading } = usePayments();
  const { data: players } = usePublicPlayers();
  const { data: summary } = usePublicSummary();
  const activeFines = fines.filter((fine) => !fine.voidedAt);
  const playerData = useMemo(() => players.filter((player) => player.fineTotal > 0).toSorted((a, b) => b.fineTotal - a.fineTotal).map((player) => ({ name: playerName(player), multe: player.fineTotal, debito: player.remainingTotal })), [players]);
  const categoryData = useMemo(() => Object.entries(activeFines.reduce<Record<string, number>>((result, fine) => { result[fine.category] = (result[fine.category] ?? 0) + fine.finalAmount; return result; }, {})).map(([key, value]) => ({ name: FINE_RULES[key as FineCategory]?.label ?? key, importo: value })).toSorted((a, b) => b.importo - a.importo), [activeFines]);
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; multe: number; pagamenti: number; numeroMulte: number }>();
    for (const fine of activeFines) { const date = fine.date.toDate(); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; const entry = map.get(key) ?? { month: new Intl.DateTimeFormat('it-IT', { month: 'short', year: '2-digit' }).format(date), multe: 0, pagamenti: 0, numeroMulte: 0 }; entry.multe += fine.finalAmount; if (fine.finalAmount > 0) entry.numeroMulte += 1; map.set(key, entry); }
    for (const payment of payments.filter((item) => !item.canceledAt)) { const date = payment.date.toDate(); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; const entry = map.get(key) ?? { month: new Intl.DateTimeFormat('it-IT', { month: 'short', year: '2-digit' }).format(date), multe: 0, pagamenti: 0, numeroMulte: 0 }; entry.pagamenti += payment.amount; map.set(key, entry); }
    return [...map.entries()].toSorted(([a], [b]) => a.localeCompare(b)).map(([, item]) => item);
  }, [activeFines, payments]);
  const categoryCounts = useMemo(() => Object.entries(activeFines.reduce<Record<string, number>>((acc, fine) => { acc[fine.category] = (acc[fine.category] ?? 0) + 1; return acc; }, {})).toSorted((a, b) => b[1] - a[1]), [activeFines]);
  const moneyFines = activeFines.filter((fine) => fine.finalAmount > 0);
  const average = moneyFines.length ? moneyFines.reduce((sum, fine) => sum + fine.finalAmount, 0) / moneyFines.length : 0;
  const waiting = finesLoading || paymentsLoading;
  return <>
    <PageHeading eyebrow="AREA AMMINISTRATIVA" title="Statistiche" description="Andamento delle sanzioni e della cassa nella stagione." />
    <section className="metric-grid stats-kpis"><Stat icon={<ClipboardList />} title="Totale multe" value={euros(summary.fineTotal)} /><Stat icon={<Banknote />} title="Totale incassato" value={euros(summary.paidTotal)} /><Stat icon={<TrendingUp />} title="Da incassare" value={euros(summary.remainingTotal)} /><Stat icon={<Users />} title="Media multa" value={euros(average)} /></section>
    {waiting ? <Loading /> : !activeFines.length ? <div className="panel"><EmptyState title="Nessun dato statistico" body="Le statistiche si popoleranno quando verranno registrate multe e pagamenti." /></div> : <div className="charts-grid">
      <ChartCard title="Totale multe per giocatore" subtitle="Importi finali registrati"><ResponsiveContainer width="100%" height={275}><BarChart data={playerData.slice(0, 10)} margin={{ top: 8, right: 16, left: 2, bottom: 36 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 11 }} angle={-28} textAnchor="end" interval={0} /><YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(value) => `€${value}`} /><Tooltip formatter={(value) => euros(Number(value))} /><Bar dataKey="multe" fill="#74bd6b" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Multe per categoria" subtitle="Importo aggregato"><ResponsiveContainer width="100%" height={275}><PieChart><Pie data={categoryData} dataKey="importo" nameKey="name" innerRadius={57} outerRadius={94} paddingAngle={3}>{categoryData.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => euros(Number(value))} /><LegendList data={categoryData.map((item, index) => ({ ...item, color: COLORS[index % COLORS.length] }))} /></PieChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Movimenti nel tempo" subtitle="Multe registrate e pagamenti incassati"><ResponsiveContainer width="100%" height={260}><BarChart data={monthlyData} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} /><YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(value) => `€${value}`} /><Tooltip formatter={(value) => euros(Number(value))} /><Bar dataKey="multe" name="Multe" fill="#74bd6b" radius={[4, 4, 0, 0]} /><Bar dataKey="pagamenti" name="Pagamenti" fill="#5992d5" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer><div className="chart-legend"><span><i className="legend-dot green-dot" /> Multe</span><span><i className="legend-dot blue-dot" /> Incassi</span></div></ChartCard>
      <ChartCard title="Debiti per giocatore" subtitle="Residuo ancora da incassare"><ResponsiveContainer width="100%" height={260}><BarChart data={playerData.toSorted((a, b) => b.debito - a.debito).slice(0, 10)} layout="vertical" margin={{ top: 6, right: 20, left: 10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" /><XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(value) => `€${value}`} /><YAxis type="category" dataKey="name" width={105} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><Tooltip formatter={(value) => euros(Number(value))} /><Bar dataKey="debito" fill="#d5a457" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Numero multe per mese" subtitle="Solo sanzioni con importo economico"><ResponsiveContainer width="100%" height={260}><BarChart data={monthlyData} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" /><XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><Tooltip formatter={(value) => [`${value} multe`, 'Numero']} /><Bar dataKey="numeroMulte" name="Multe" fill="#74bd6b" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Categoria più frequente" subtitle="Numero di registrazioni"><div className="frequent-list">{categoryCounts.slice(0, 6).map(([category, count], index) => <div className="frequent-row" key={category}><span className="frequent-rank">{index + 1}</span><span>{FINE_RULES[category as FineCategory]?.label ?? category}</span><strong>{count}</strong></div>)}</div></ChartCard>
    </div>}
    <div className="chart-note">Le statistiche escludono le multe annullate. I pagamenti annullati non vengono conteggiati negli incassi.</div>
  </>;
}

function Stat({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) { return <div className="metric-card"><div className="metric-icon metric-neutral">{icon}</div><div className="metric-copy"><span>{title}</span><strong>{value}</strong></div></div>; }
function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section className="panel chart-card"><div className="panel-heading compact"><div><h2>{title}</h2><small>{subtitle}</small></div></div>{children}</section>; }
function LegendList({ data }: { data: Array<{ name: string; importo: number; color: string }> }) { return <div className="pie-legend">{data.slice(0, 4).map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}<strong>{euros(item.importo)}</strong></span>)}</div>; }
