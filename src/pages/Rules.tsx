import { Banknote, ClipboardCheck, Croissant, RefreshCw } from 'lucide-react';
import { PageHeading } from '../components/ui';
import { RULES_PAGE } from '../constants/fineRules';

const types = {
  fine: { label: 'Multa', className: 'rule-fine', icon: Banknote },
  pastry: { label: 'Paste', className: 'rule-pastry', icon: Croissant },
  both: { label: 'Multa + paste', className: 'rule-both', icon: Croissant },
  obligation: { label: 'Obbligo', className: 'rule-obligation', icon: ClipboardCheck },
  responsibility: { label: 'Responsabilità', className: 'rule-responsibility', icon: RefreshCw },
} as const;

export function Rules() {
  return <>
    <PageHeading eyebrow="DOCUMENTO UFFICIALE" title="Regolamento interno" description="Lecce Volley 26/27 · Regole e sanzioni economiche di riferimento." />
    <div className="rules-callout"><span>LV</span><div><strong>LECCE VOLLEY 26/27</strong><small>Regolamento interno della squadra</small></div><span className="rules-callout-season">2026—27</span></div>
    <div className="rules-list">{RULES_PAGE.map((rule) => {
      const type = types[rule.type]; const Icon = type.icon;
      return <article className="rule-card" key={rule.number}><div className="rule-number">{String(rule.number).padStart(2, '0')}</div><div className="rule-content"><div className="rule-title-row"><h2>{rule.title}</h2><span className={`rule-badge ${type.className}`}><Icon size={13} />{type.label}</span></div><p>{rule.description}</p><div className="rule-sanction"><strong>Sanzione / disposizione</strong><span>{rule.sanction}</span></div></div></article>;
    })}</div>
    <div className="rules-footnote">Le paste sono una sanzione separata e non vengono convertite in importi economici. Nel giorno della partita il raddoppio riguarda esclusivamente la parte monetaria.</div>
  </>;
}
