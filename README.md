# Lecce Volley 26/27 · Gestione multe

Gestionale mobile-first per la rosa, le sanzioni economiche, i pagamenti e la situazione contabile della stagione 2026/27.

## Due siti con lo stesso progetto Firebase

Il progetto può essere pubblicato in due modalità:

- `VITE_APP_MODE=public`: sito da condividere con la squadra. Non mostra login né strumenti di modifica; chi apre il link può leggere la situazione e aprire il profilo di ogni giocatore.
- `VITE_APP_MODE=admin`: sito privato per te. Mostra il pannello di gestione e richiede il tuo account Google autorizzato.

Il sito pubblico è quindi completamente aperto. Il sito admin può essere distribuito su un secondo progetto Vercel con un dominio che condividi solo tu. Entrambi usano lo stesso progetto Firebase, perciò le modifiche fatte dall’area admin compaiono subito nel link pubblico.

## Avvio locale

1. Installa Node.js 20 o superiore.
2. Esegui `npm install`.
3. Copia `.env.example` in `.env.local` e inserisci i dati del progetto Firebase.
4. Lascia `VITE_APP_MODE=public` per provare il sito condivisibile. Per lavorare localmente nell’area admin imposta `VITE_APP_MODE=admin`.
5. Crea il database Cloud Firestore e distribuisci `firestore.rules` (per esempio con `firebase deploy --only firestore:rules`).
6. Per la modalità admin, abilita il provider **Google** in Firebase Authentication. Se il provider **Email/Password** era già attivo e non ti serve più, disabilitalo.
7. Inserisci il tuo UID Google in `VITE_ADMIN_UIDS` e crea in Firestore `admins/{UID_FIREBASE}` con `{ "active": true }`.
8. Avvia con `npm run dev`.

Il percorso admin non è una misura di sicurezza. L’autorizzazione reale viene da Google Authentication, dall’UID configurato e dalle regole Firestore. Non inserire password, service account o chiavi private nel client.

## Modello dati

- `players`, `fines`, `payments`, `auditLogs`: area privata, leggibile e modificabile dagli admin.
- `publicPlayers`, `publicSummary`: proiezioni ridotte per il sito pubblico; contengono nomi, stato attivo e totali contabili, senza note o dati tecnici.
- `admins/{uid}`: accesso admin abilitato dal documento `active: true`; solo il proprietario del progetto o Admin SDK può amministrare questa collection.

La rosa iniziale si aggiunge manualmente dalla pagina **Giocatori**. L’archiviazione di un giocatore conserva lo storico. Le multe annullate e i pagamenti annullati restano registrati; le modifiche e gli annullamenti creano eventi in `auditLogs`.

## Regole di calcolo

Le formule centrali sono in `src/lib/fineCalculator.ts`; i valori e i testi sono in `src/constants/fineRules.ts`. Le due infrazioni relative alle bottigliette possono essere registrate insieme ma restano due righe separate. Le paste sono registrate come obbligo separato e non vengono trasformate in denaro. Il moltiplicatore del giorno partita raddoppia soltanto gli importi economici.

I pagamenti sono assegnati alle multe non saldate in ordine cronologico. Un pagamento superiore al residuo viene rifiutato. L’annullamento di un pagamento ricalcola le assegnazioni e lo stato delle multe ancora attive.

## Controlli

```sh
npm test
npm run build
```

## Deploy su Vercel

### Sito pubblico

Importa il repository in un progetto Vercel, imposta `VITE_APP_MODE=public` e le variabili `VITE_FIREBASE_*`. Questo è il link da condividere con la squadra.

### Sito admin

Crea un secondo progetto Vercel dallo stesso repository, imposta `VITE_APP_MODE=admin`, le stesse variabili `VITE_FIREBASE_*` e `VITE_ADMIN_UIDS`. Aggiungi il dominio admin ai domini autorizzati di Firebase Authentication. `vercel.json` inoltra le route client-side a `index.html`. Distribuisci anche `firestore.rules` al progetto Firebase.
