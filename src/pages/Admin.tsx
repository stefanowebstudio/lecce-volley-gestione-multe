import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Settings2, ShieldCheck } from 'lucide-react';
import { PageHeading } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import { useFines, usePayments, usePlayers } from '../hooks/useFirestore';
import { csvDownload, dateLabel, userFacingError } from '../lib/utils';
import { exportJson } from '../services/fineService';

export function Admin() {
  const toast = useToast();
  const { data: players } = usePlayers();
  const { data: fines } = useFines();
  const { data: payments } = usePayments();
  const [exporting, setExporting] = useState(false);
  const exportFile = async (kind: 'players' | 'fines' | 'payments' | 'json') => {
    setExporting(true);
    try {
      if (kind === 'json') await exportJson();
      if (kind === 'players') csvDownload('lecce-volley-26-27-giocatori.csv', players.map((player) => ({ id: player.id, nome: player.name, cognome: player.surname, maglia: player.shirtNumber, attivo: player.active })));
      if (kind === 'fines') csvDownload('lecce-volley-26-27-multe.csv', fines.map((fine) => ({ id: fine.id, giocatore: fine.playerName, categoria: fine.category, descrizione: fine.description, data: dateLabel(fine.date), importo_base: fine.baseAmount, moltiplicatore: fine.multiplier, importo_finale: fine.finalAmount, pagato: fine.paidAmount, residuo: fine.remainingAmount, stato: fine.status, giorno_partita: fine.isMatchDay, annullata: !!fine.voidedAt })));
      if (kind === 'payments') csvDownload('lecce-volley-26-27-pagamenti.csv', payments.map((payment) => ({ id: payment.id, giocatore: payment.playerName, data: dateLabel(payment.date), importo: payment.amount, nota: payment.note, annullato: !!payment.canceledAt })));
      toast('Esportazione pronta.');
    } catch (cause) { toast(userFacingError(cause, 'Esportazione non riuscita.'), 'error'); }
    finally { setExporting(false); }
  };
  return <>
    <PageHeading eyebrow="CONTROLLO E CONFIGURAZIONE" title="Pannello admin" description="Strumenti per la stagione Lecce Volley 2026/27." />
    <section className="admin-welcome"><div className="admin-shield"><ShieldCheck size={23} /></div><div><strong>Area amministrativa protetta</strong><span>Accesso tramite il tuo account Google autorizzato e regole Firestore.</span></div></section>
    <div className="settings-grid"><section className="panel settings-panel"><div className="settings-icon"><FileSpreadsheet /></div><h2>Esporta dati CSV</h2><p>Scarica un foglio apribile con Excel o Google Sheets per ogni sezione.</p><div className="export-list"><button disabled={exporting} onClick={() => void exportFile('players')}><span>Giocatori</span><Download size={16} /></button><button disabled={exporting} onClick={() => void exportFile('fines')}><span>Multe</span><Download size={16} /></button><button disabled={exporting} onClick={() => void exportFile('payments')}><span>Pagamenti</span><Download size={16} /></button></div></section>
      <section className="panel settings-panel"><div className="settings-icon settings-json"><FileJson /></div><h2>Backup completo</h2><p>Esporta giocatori, multe e pagamenti in un unico file JSON con data di esportazione.</p><button className="button button-outline" disabled={exporting} onClick={() => void exportFile('json')}><Download size={16} />{exporting ? 'Preparazione…' : 'Scarica backup JSON'}</button></section>
      <section className="panel settings-panel season-settings"><div className="settings-icon"><Settings2 /></div><h2>Stagione 2026/27</h2><p>Lo spazio dati è dedicato alla stagione corrente. Il reset della stagione non è abilitato, per proteggere lo storico.</p><div className="season-status"><span className="season-dot" />Stagione attiva</div><small>{players.length} giocatori · {fines.length} sanzioni · {payments.length} movimenti</small></section>
    </div>
    <div className="admin-note">Per assegnare i privilegi a un nuovo amministratore, abilita l’UID nel progetto Firebase e aggiungi il documento <code>admins/{'{uid}'}</code> come descritto nel README. Le credenziali non fanno parte del repository.</div>
  </>;
}
