import { collection, doc, getDocs, query, runTransaction, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { requireAuth, requireDb } from '../lib/firebase';
import { SEASON_ID } from '../constants/app';
import type { Fine, PublicPlayer, PublicSummary } from '../types';
import { playerName } from '../lib/utils';

const cents = (n: number) => Math.round(n * 100) / 100;

export async function registerPayment(input: { playerId: string; amount: number; date: Date; note?: string }) {
  const db = requireDb();
  requireAuth();
  if (!input.playerId) throw new Error('Seleziona un giocatore.');
  const amount = cents(input.amount);
  if (!Number.isFinite(input.amount) || amount <= 0 || Math.abs(input.amount - amount) > 0.001) throw new Error('Inserisci un importo positivo con massimo due decimali.');
  const playerRef = doc(db, 'players', input.playerId);
  const publicRef = doc(db, 'publicPlayers', input.playerId);
  const summaryRef = doc(db, 'publicSummary', 'season');
  const finesQuery = query(collection(db, 'fines'), where('playerId', '==', input.playerId));
  const initialFines = await getDocs(finesQuery);
  const paymentRef = doc(collection(db, 'payments'));
  const auditRef = doc(collection(db, 'auditLogs'));
  await runTransaction(db, async (tx) => {
    const [playerSnap, publicSnap, summarySnap, ...fineSnaps] = await Promise.all([
      tx.get(playerRef), tx.get(publicRef), tx.get(summaryRef),
      ...initialFines.docs.map((snapshot) => tx.get(doc(db, 'fines', snapshot.id))),
    ]);
    if (!playerSnap.exists() || !publicSnap.exists() || !summarySnap.exists()) throw new Error('Giocatore non trovato.');
    const pub = publicSnap.data() as PublicPlayer;
    const summary = summarySnap.data() as PublicSummary;
    const fines = fineSnaps.map((snapshot) => ({ ...snapshot.data(), id: snapshot.id } as Fine))
      .filter((fine) => !fine.voidedAt && fine.remainingAmount > 0)
      .sort((a, b) => a.date.toMillis() - b.date.toMillis());
    const due = cents(fines.reduce((sum, fine) => sum + fine.remainingAmount, 0));
    if (due !== cents(pub.remainingTotal)) throw new Error('Il saldo è stato aggiornato. Riapri il pagamento e riprova.');
    if (amount > due) throw new Error('Il pagamento non può essere superiore al debito residuo.');
    const allocations: Array<{ fineId: string; amount: number }> = [];
    let amountLeft = amount;
    for (const fine of fines) {
      if (amountLeft <= 0) break;
      const allocated = Math.min(fine.remainingAmount, amountLeft);
      const paidAmount = cents(fine.paidAmount + allocated);
      const remainingAmount = cents(fine.finalAmount - paidAmount);
      tx.update(doc(db, 'fines', fine.id), {
        paidAmount, remainingAmount,
        status: remainingAmount === 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID',
        updatedAt: serverTimestamp(),
      });
      allocations.push({ fineId: fine.id, amount: allocated });
      amountLeft = cents(amountLeft - allocated);
    }
    const payment: Record<string, unknown> = {
      id: paymentRef.id, playerId: input.playerId,
      playerName: playerName({ name: String(playerSnap.data().name), surname: String(playerSnap.data().surname) }),
      amount, date: Timestamp.fromDate(input.date), allocations, seasonId: SEASON_ID,
      createdAt: serverTimestamp(),
    };
    if (input.note?.trim()) payment.note = input.note.trim();
    tx.set(paymentRef, payment);
    tx.update(publicRef, { paidTotal: cents(pub.paidTotal + amount), remainingTotal: cents(pub.remainingTotal - amount) });
    tx.update(summaryRef, {
      paidTotal: cents(summary.paidTotal + amount), remainingTotal: cents(summary.remainingTotal - amount), updatedAt: serverTimestamp(),
    });
    tx.set(auditRef, { timestamp: serverTimestamp(), adminUid: requireAuth().uid, action: 'PAYMENT_REGISTERED', targetId: paymentRef.id });
  });
  return paymentRef.id;
}
