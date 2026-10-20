export type FineRule = {
  label: string;
  description: string;
  kind: 'FIXED' | 'CALCULATED' | 'PASTRY';
  amount?: number;
  maxAmount?: number;
  pastries?: boolean;
};

export const FINE_RULES = {
  TRAINING_DELAY: {
    label: 'Ritardo allenamento',
    description: 'Primi 5 minuti €3, poi +€1 ogni ulteriori 5 minuti. Massimo €30.',
    kind: 'CALCULATED',
    maxAmount: 30,
  },
  UNJUSTIFIED_ABSENCE: {
    label: 'Assenza ingiustificata',
    description: '€5 di multa e paste richieste.',
    kind: 'FIXED',
    amount: 5,
    pastries: true,
  },
  PASTRY_EVENT: {
    label: 'Paste / evento',
    description: 'Paste per evento o ricorrenza. Nessuna sanzione economica automatica.',
    kind: 'PASTRY',
    amount: 0,
    pastries: true,
  },
  PHONE_RING: {
    label: 'Cellulare: suoneria',
    description: 'Cellulare che suona nei contesti vietati.',
    kind: 'FIXED',
    amount: 2,
  },
  PHONE_RING_AND_ANSWER: {
    label: 'Cellulare: suoneria e risposta',
    description: 'Suoneria e risposta non giustificata.',
    kind: 'FIXED',
    amount: 10,
  },
  MATCH_DELAY: {
    label: 'Ritardo trasferta / partita in casa',
    description: 'Primi 5 minuti €3, poi +€1 per ogni minuto successivo. Massimo €50.',
    kind: 'CALCULATED',
    maxAmount: 50,
  },
  TRAINING_CLOTHING: {
    label: 'Vestiario allenamento',
    description: 'Mancato utilizzo del vestiario ufficiale fornito dalla società.',
    kind: 'FIXED',
    amount: 5,
  },
  BOTTLE_LEFT: {
    label: 'Bottiglietta dimenticata',
    description: 'Bottiglietta lasciata al termine dell’allenamento.',
    kind: 'FIXED',
    amount: 2,
  },
  BOTTLE_NUMBER_MISSING: {
    label: 'Numero maglia mancante',
    description: 'Numero di maglia non segnato sulla bottiglietta.',
    kind: 'FIXED',
    amount: 2,
  },
  MATCH_KIT: {
    label: 'Completo ufficiale',
    description: 'Mancato rispetto delle disposizioni relative al completo ufficiale.',
    kind: 'FIXED',
    amount: 10,
  },
  FRUSTRATION_GESTURE: {
    label: 'Gesto di stizza',
    description: 'Gesto di stizza durante allenamenti, amichevoli o partite ufficiali.',
    kind: 'FIXED',
    amount: 5,
  },
  RED_CARD: {
    label: 'Cartellino rosso',
    description: 'Cartellino rosso.',
    kind: 'FIXED',
    amount: 15,
  },
  EXPULSION_DISQUALIFICATION: {
    label: 'Espulsione / squalifica',
    description: 'Paste da portare singolarmente. Nessuna sanzione economica.',
    kind: 'PASTRY',
    amount: 0,
    pastries: true,
  },
  AWAY_TRACKSUIT: {
    label: 'Tuta societaria in trasferta',
    description: 'Mancato utilizzo della tuta societaria in trasferta.',
    kind: 'FIXED',
    amount: 10,
  },
} as const satisfies Record<string, FineRule>;

export type FineCategory = keyof typeof FINE_RULES;
export const FINE_RULE_ENTRIES = Object.entries(FINE_RULES) as [FineCategory, FineRule][];

export const RULES_PAGE = [
  { number: 1, title: 'Orario e puntualità agli allenamenti', description: 'L’orario indicato dal mister corrisponde all’inizio dell’allenamento sul parquet. L’atleta deve essere già pronto. I ritardi preventivamente comunicati allo staff e alla squadra entro un’ora dall’inizio dell’allenamento sono esclusi dalla sanzione.', sanction: '€3 entro i primi 5 minuti; +€1 ogni ulteriori 5 minuti; massimo €30.', type: 'fine' },
  { number: 2, title: 'Assenza ingiustificata', description: 'Assenza ingiustificata.', sanction: 'Paste e €5 di multa.', type: 'both' },
  { number: 3, title: 'Giorno delle paste', description: 'Il martedì è il giorno delle paste. Previste in occasione di compleanni, esordi, arrivo di nuovi giocatori, conseguimento della patente, fidanzamento, acquisto di una nuova macchina, attacco sotto rete, battuta sotto rete (salvo esercizi specifici per la palla corta) ed ecc. Il capitano decide se portarle in coppia o singolarmente.', sanction: 'Paste; nessuna multa economica automatica.', type: 'pastry' },
  { number: 4, title: 'Cellulare', description: 'È vietato far suonare il cellulare durante allenamento, riunione societaria, riunione tecnica e pranzo/cena ufficiale in trasferta.', sanction: 'Suoneria €2; suoneria e risposta non giustificata €10.', type: 'fine' },
  { number: 5, title: 'Ritardo a trasferte e partite in casa', description: 'Ritardo agli orari concordati per trasferte e partite in casa.', sanction: '€3 per i primi 5 minuti; +€1 per ogni minuto successivo; massimo €50.', type: 'fine' },
  { number: 6, title: 'Vestiario di allenamento', description: 'Se fornito dalla società, è obbligatorio utilizzare il vestiario ufficiale.', sanction: '€5.', type: 'fine' },
  { number: 7, title: 'Bottigliette', description: 'Non lasciare bottigliette al termine dell’allenamento e riportare il proprio numero di maglia sulla bottiglietta.', sanction: 'Bottiglietta dimenticata €2; numero di maglia non segnato +€2.', type: 'fine' },
  { number: 8, title: 'Completo di gara', description: 'Rispettare le disposizioni relative al completo ufficiale.', sanction: '€10.', type: 'fine' },
  { number: 9, title: 'Gesti di stizza', description: 'Durante allenamenti, amichevoli e partite ufficiali.', sanction: '€5.', type: 'fine' },
  { number: 10, title: 'Cartellino rosso', description: 'Cartellino rosso.', sanction: '€15.', type: 'fine' },
  { number: 11, title: 'Espulsione / squalifica', description: 'Espulsione o squalifica.', sanction: 'Paste da portare singolarmente; nessuna multa economica.', type: 'pastry' },
  { number: 12, title: 'Borsa valori', description: 'Il giocatore più piccolo porta la borsa valori a ogni partita. La borsa deve essere chiusa, riaperta esclusivamente nello spogliatoio e utilizzare un lucchetto ove necessario. La responsabilità è del proprietario.', sanction: 'Responsabilità, senza sanzione economica esplicita.', type: 'responsibility' },
  { number: 13, title: 'Compiti dei più piccoli', description: 'A turno: occuparsi dello smontaggio/montaggio dei pali, raccogliere i palloni e contarli al termine dell’allenamento.', sanction: 'Obbligo, senza sanzione economica esplicita.', type: 'obligation' },
  { number: 14, title: 'Vestiario partite', description: 'Per le partite in casa è consentita libertà di vestiario. Per le trasferte è obbligatoria la tuta societaria.', sanction: '€10 per il mancato rispetto della regola in trasferta.', type: 'fine' },
  { number: 15, title: 'Giorno della partita', description: 'Tutte le multe previste dal regolamento valgono doppio nel giorno della partita. Il raddoppio si applica solo alla parte economica.', sanction: 'Moltiplicatore ×2 sulla multa economica.', type: 'fine' },
] as const;
