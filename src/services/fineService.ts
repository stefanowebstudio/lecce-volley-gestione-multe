import {
  collection, deleteField, doc, getDocs, query, runTransaction, serverTimestamp, Timestamp, where,
} from 'firebase/firestore';
import { FINE_RULES } from '../constants/fineRules';
import { SEASON_ID } from '../constants/app';
import { calculateCategoryBase, calculateFine } from '../lib/fineCalculator';
import { isConfiguredAdmin, requireAuth, requireDb } from '../lib/firebase';
import type { CreateFineInput, Fine, FineStatus, Payment, PublicPlayer, PublicSummary } from '../types';
import { playerName } from '../lib/utils';

const cents = (n: number) => Math.round(n * 100) / 100;
const statusFor = (paid: number, total: number): FineStatus => paid >= total ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';

function officialBase(input: CreateFineInput): number {
  if (!Object.hasOwn(FINE_RULES, input.category)) throw new Error('Categoria multa non valida.');
  if (!Number.isFinite(input.date.getTime())) throw new Error('La data della multa non è valida.');
  if (input.communicatedInAdvance) throw new Error('Il ritardo comunicato entro un’ora è escluso dalla sanzione.');
  if ((input.category === 'TRAINING_DELAY' || input.category === 'MATCH_DELAY') && (!Number.isInteger(input.minutes) || Number(input.minutes) <= 0)) {
    throw new Error('Inserisci minuti di ritardo interi e maggiori di zero.');
  }
  const expected = calculateCategoryBase(input.category as keyof typeof FINE_RULES, input.minutes ?? 0);
  if (!Number.isFinite(input.baseAmount) || cents(input.baseAmount) !== expected) throw new Error('L’importo non corrisponde al regolamento.');
  return expected;
}

function audit(action: string, targetId: string) {
  const db = requireDb();
  return { ref: doc(collection(db, 'auditLogs')), data: { timestamp: serverTimestamp(), adminUid: requireAuth().uid, action, targetId } };
}

export async function createFines(inputs: CreateFineInput[]): Promise<string[]> {
  const db = requireDb();
  const user = requireAuth();
  if (!isConfiguredAdmin(user.uid)) throw new Error('Account non abilitato.');
  if (!inputs.length) throw new Error('Seleziona almeno un’infrazione.');
  const playerId = inputs[0].playerId;
  if (!playerId || inputs.some((input) => input.playerId !== playerId)) throw new Error('Seleziona un giocatore valido.');
  const playerRef = doc(db, 'players', playerId);
  const publicRef = doc(db, 'publicPlayers', playerId);
  const summaryRef = doc(db, 'publicSummary', 'season');
  const newRefs = inputs.map(() => doc(collection(db, 'fines')));
  const logs = newRefs.map((ref) => audit('FINE_CREATED', ref.id));
  await runTransaction(db, async (tx) => {
    const [playerSnap, publicSnap, summarySnap] = await Promise.all([tx.get(playerRef), tx.get(publicRef), tx.get(summaryRef)]);
    if (!playerSnap.exists()) throw new Error('Giocatore non trovato.');
    const player = playerSnap.data();
    if (!player.active) throw new Error('Il giocatore è disattivato e non può ricevere nuove multe.');
    const publicData = (publicSnap.data() ?? { fineTotal: 0, paidTotal: 0, remainingTotal: 0, fineCount: 0 }) as PublicPlayer;
    const summary = (summarySnap.data() ?? { fineTotal: 0, paidTotal: 0, remainingTotal: 0, fineCount: 0 }) as PublicSummary;
    let totalAdded = 0;
    const fineDocs = inputs.map((input, index) => {
      const calc = calculateFine(officialBase(input), input.isMatchDay);
      totalAdded += calc.finalAmount;
      const rule = FINE_RULES[input.category as keyof typeof FINE_RULES];
      return {
        id: newRefs[index].id, playerId, playerName: playerName({ name: String(player.name), surname: String(player.surname) }), seasonId: SEASON_ID, category: input.category,
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        baseAmount: calc.baseAmount, multiplier: calc.multiplier, finalAmount: calc.finalAmount,
        date: Timestamp.fromDate(input.date), isMatchDay: input.isMatchDay,
        paidAmount: 0, remainingAmount: calc.finalAmount, status: calc.finalAmount === 0 ? 'PAID' : 'UNPAID',
        ...(input.pastryRequired || rule.kind === 'PASTRY' ? { pastryRequired: true } : {}),
        ...(input.pastryMode ? { pastryMode: input.pastryMode } : {}),
        ...(input.minutes !== undefined ? { minutes: input.minutes } : {}),
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      };
    });
    const monetaryFineCount = fineDocs.filter((fine) => fine.finalAmount > 0).length;
    fineDocs.forEach((fine, index) => {
      tx.set(newRefs[index], fine);
      tx.set(logs[index].ref, logs[index].data);
    });
    tx.set(publicRef, {
      ...publicData, id: playerId, name: player.name, surname: player.surname, active: player.active,
      fineTotal: cents(publicData.fineTotal + totalAdded),
      remainingTotal: cents(publicData.remainingTotal + totalAdded), fineCount: publicData.fineCount + monetaryFineCount,
    });
    tx.set(summaryRef, {
      ...summary, fineTotal: cents(summary.fineTotal + totalAdded),
      remainingTotal: cents(summary.remainingTotal + totalAdded), fineCount: summary.fineCount + monetaryFineCount,
      updatedAt: serverTimestamp(), seasonId: SEASON_ID,
    });
  });
  return newRefs.map((ref) => ref.id);
}

export async function updateFineDetails(fine: Fine, patch: { description?: string; date: Date }) {
  const db = requireDb();
  requireAuth();
  const ref = doc(db, 'fines', fine.id);
  const log = audit('FINE_UPDATED', fine.id);
  await runTransaction(db, async (tx) => {
    const current = await tx.get(ref);
    if (!current.exists() || current.data().voidedAt) throw new Error('Multa non trovata.');
    tx.update(ref, {
      description: patch.description?.trim() || '', date: Timestamp.fromDate(patch.date), updatedAt: serverTimestamp(),
    });
    tx.set(log.ref, log.data);
  });
}

type LedgerFine = Fine & { refId: string };
type LedgerPayment = Payment & { refId: string };
function allocateLedger(fines: LedgerFine[], payments: LedgerPayment[]) {
  const paidByFine = new Map<string, number>();
  const updatedAllocations = new Map<string, Array<{ fineId: string; amount: number }>>();
  const eligible = fines.filter((fine) => !fine.voidedAt).sort((a, b) => a.date.toMillis() - b.date.toMillis());
  const remaining = new Map(eligible.map((fine) => [fine.id, fine.finalAmount]));
  const orderedPayments = payments.filter((payment) => !payment.canceledAt).sort((a, b) => a.date.toMillis() - b.date.toMillis());
  for (const payment of orderedPayments) {
    let unallocated = payment.amount;
    const allocations: Array<{ fineId: string; amount: number }> = [];
    for (const fine of eligible) {
      if (unallocated <= 0) break;
      const due = remaining.get(fine.id) ?? 0;
      if (!due) continue;
      const amount = Math.min(due, unallocated);
      remaining.set(fine.id, cents(due - amount));
      paidByFine.set(fine.id, cents((paidByFine.get(fine.id) ?? 0) + amount));
      allocations.push({ fineId: fine.id, amount });
      unallocated = cents(unallocated - amount);
    }
    updatedAllocations.set(payment.id, allocations);
  }
  return { paidByFine, allocations: updatedAllocations, remaining };
}

export async function amendFine(fine: Fine, input: CreateFineInput) {
  const db = requireDb();
  requireAuth();
  const verifiedBase = officialBase(input);
  const fineQuery = query(collection(db, 'fines'), where('playerId', '==', fine.playerId));
  const paymentQuery = query(collection(db, 'payments'), where('playerId', '==', fine.playerId));
  const [initialFines, initialPayments] = await Promise.all([getDocs(fineQuery), getDocs(paymentQuery)]);
  const publicRef = doc(db, 'publicPlayers', fine.playerId);
  const summaryRef = doc(db, 'publicSummary', 'season');
  const log = audit('FINE_UPDATED', fine.id);
  await runTransaction(db, async (tx) => {
    const [fineSnaps, paymentSnaps, publicSnap, summarySnap] = await Promise.all([
      Promise.all(initialFines.docs.map((snap) => tx.get(doc(db, 'fines', snap.id)))),
      Promise.all(initialPayments.docs.map((snap) => tx.get(doc(db, 'payments', snap.id)))),
      tx.get(publicRef), tx.get(summaryRef),
    ]);
    const fines = fineSnaps.map((snap) => ({ ...snap.data(), refId: snap.id } as LedgerFine));
    const payments = paymentSnaps.map((snap) => ({ ...snap.data(), refId: snap.id } as LedgerPayment));
    const target = fines.find((item) => item.id === fine.id);
    if (!target || target.voidedAt) throw new Error('Multa non trovata.');
    const publicData = publicSnap.data() as PublicPlayer | undefined;
    const summary = summarySnap.data() as PublicSummary | undefined;
    if (!publicData || !summary) throw new Error('Riepilogo pubblico non disponibile.');
    const priorFineTotal = cents(fines.filter((item) => !item.voidedAt).reduce((sum, item) => sum + item.finalAmount, 0));
    const priorPaidTotal = cents(payments.filter((payment) => !payment.canceledAt).reduce((sum, payment) => sum + payment.amount, 0));
    if (priorFineTotal !== cents(publicData.fineTotal) || priorPaidTotal !== cents(publicData.paidTotal) || fines.filter((item) => !item.voidedAt && item.finalAmount > 0).length !== publicData.fineCount) {
      throw new Error('Il registro è stato aggiornato da un altro admin. Ricarica e riprova.');
    }
    const oldTargetAmount = target.finalAmount;
    const calc = calculateFine(verifiedBase, input.isMatchDay);
    const rule = FINE_RULES[input.category as keyof typeof FINE_RULES];
    Object.assign(target, {
      category: input.category, description: input.description?.trim() ?? '',
      baseAmount: calc.baseAmount, multiplier: calc.multiplier, finalAmount: calc.finalAmount,
      date: Timestamp.fromDate(input.date), isMatchDay: input.isMatchDay,
      pastryRequired: !!input.pastryRequired || rule.kind === 'PASTRY',
      pastryMode: input.pastryMode, minutes: input.minutes,
    });
    const activeFines = fines.filter((item) => !item.voidedAt);
    const paymentTotal = cents(payments.filter((payment) => !payment.canceledAt).reduce((sum, payment) => sum + payment.amount, 0));
    const fineTotal = cents(activeFines.reduce((sum, item) => sum + item.finalAmount, 0));
    if (paymentTotal > fineTotal) throw new Error('La modifica renderebbe i pagamenti superiori al totale delle multe.');
    const allocation = allocateLedger(fines, payments);
    for (const item of activeFines) {
      const paidAmount = allocation.paidByFine.get(item.id) ?? 0;
      item.paidAmount = paidAmount;
      item.remainingAmount = cents(item.finalAmount - paidAmount);
      item.status = statusFor(paidAmount, item.finalAmount);
      tx.update(doc(db, 'fines', item.id), {
        ...(item.id === fine.id ? {
          category: item.category, description: item.description, baseAmount: item.baseAmount, multiplier: item.multiplier,
          finalAmount: item.finalAmount, date: item.date, isMatchDay: item.isMatchDay,
          pastryRequired: item.pastryRequired,
          pastryMode: item.pastryMode ?? deleteField(), minutes: item.minutes ?? deleteField(),
        } : {}),
        paidAmount: item.paidAmount, remainingAmount: item.remainingAmount, status: item.status, updatedAt: serverTimestamp(),
      });
    }
    for (const payment of payments) tx.update(doc(db, 'payments', payment.id), { allocations: payment.canceledAt ? [] : allocation.allocations.get(payment.id) ?? [] });
    const remainingTotal = cents(activeFines.reduce((sum, item) => sum + item.remainingAmount, 0));
    const oldDue = publicData.remainingTotal;
    tx.update(publicRef, { fineTotal, remainingTotal, fineCount: activeFines.filter((item) => item.finalAmount > 0).length });
    tx.update(summaryRef, {
      fineTotal: cents(summary.fineTotal - oldTargetAmount + calc.finalAmount),
      remainingTotal: cents(summary.remainingTotal - oldDue + remainingTotal), updatedAt: serverTimestamp(),
      fineCount: Math.max(0, summary.fineCount + Number(calc.finalAmount > 0) - Number(oldTargetAmount > 0)),
    });
    tx.set(log.ref, log.data);
  });
}

async function refreshPaymentLedger(playerId: string, operation: { cancelId?: string; voidFineId?: string }) {
  const db = requireDb();
  requireAuth();
  const fineQuery = query(collection(db, 'fines'), where('playerId', '==', playerId));
  const paymentQuery = query(collection(db, 'payments'), where('playerId', '==', playerId));
  const [initialFines, initialPayments] = await Promise.all([getDocs(fineQuery), getDocs(paymentQuery)]);
  const publicRef = doc(db, 'publicPlayers', playerId);
  const summaryRef = doc(db, 'publicSummary', 'season');
  const log = audit(operation.cancelId ? 'PAYMENT_CANCELED' : 'FINE_VOIDED', operation.cancelId ?? operation.voidFineId ?? playerId);
  await runTransaction(db, async (tx) => {
    const [fineSnaps, paymentSnaps, publicSnap, summarySnap] = await Promise.all([
      Promise.all(initialFines.docs.map((snap) => tx.get(doc(db, 'fines', snap.id)))),
      Promise.all(initialPayments.docs.map((snap) => tx.get(doc(db, 'payments', snap.id)))),
      tx.get(publicRef), tx.get(summaryRef),
    ]);
    const fines: LedgerFine[] = fineSnaps.map((snap) => ({ ...snap.data(), refId: snap.id } as LedgerFine));
    const payments: LedgerPayment[] = paymentSnaps.map((snap) => ({ ...snap.data(), refId: snap.id } as LedgerPayment));
    const publicData = publicSnap.data() as PublicPlayer | undefined;
    const summary = summarySnap.data() as PublicSummary | undefined;
    if (!publicData || !summary) throw new Error('Riepilogo pubblico non disponibile.');
    const priorFineTotal = cents(fines.filter((fine) => !fine.voidedAt).reduce((sum, fine) => sum + fine.finalAmount, 0));
    const priorPaidTotal = cents(payments.filter((payment) => !payment.canceledAt).reduce((sum, payment) => sum + payment.amount, 0));
    if (priorFineTotal !== cents(publicData.fineTotal) || priorPaidTotal !== cents(publicData.paidTotal) || fines.filter((fine) => !fine.voidedAt && fine.finalAmount > 0).length !== publicData.fineCount) {
      throw new Error('Il registro è stato aggiornato da un altro admin. Ricarica e riprova.');
    }
    if (operation.cancelId) {
      const payment = payments.find((item) => item.id === operation.cancelId);
      if (!payment || payment.canceledAt) throw new Error('Pagamento non trovato o già annullato.');
      tx.update(doc(db, 'payments', operation.cancelId), { canceledAt: serverTimestamp() });
      payment.canceledAt = Timestamp.now();
    }
    if (operation.voidFineId) {
      const fine = fines.find((item) => item.id === operation.voidFineId);
      if (!fine || fine.voidedAt) throw new Error('Multa non trovata o già annullata.');
      if (fine.paidAmount > 0) throw new Error('Annulla prima il pagamento collegato, poi potrai annullare la multa.');
      fine.voidedAt = Timestamp.now();
      tx.update(doc(db, 'fines', operation.voidFineId), { voidedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    const result = allocateLedger(fines, payments);
    for (const fine of fines) {
      if (fine.voidedAt) continue;
      const paidAmount = result.paidByFine.get(fine.id) ?? 0;
      tx.update(doc(db, 'fines', fine.id), {
        paidAmount, remainingAmount: cents(fine.finalAmount - paidAmount), status: statusFor(paidAmount, fine.finalAmount), updatedAt: serverTimestamp(),
      });
    }
    for (const payment of payments) {
      const allocations = payment.canceledAt ? [] : result.allocations.get(payment.id) ?? [];
      tx.update(doc(db, 'payments', payment.id), { allocations });
    }
    const removedFine = operation.voidFineId ? fines.find((fine) => fine.id === operation.voidFineId) : undefined;
    const cancelPayment = operation.cancelId ? payments.find((payment) => payment.id === operation.cancelId) : undefined;
    const activeFines = fines.filter((fine) => !fine.voidedAt);
    const fineTotal = cents(activeFines.reduce((sum, fine) => sum + fine.finalAmount, 0));
    const paidTotal = cents(payments.filter((payment) => !payment.canceledAt).reduce((sum, payment) => sum + payment.amount, 0));
    const remainingTotal = cents(activeFines.reduce((sum, fine) => sum + (result.remaining.get(fine.id) ?? fine.finalAmount), 0));
    const oldPlayerDue = publicData.remainingTotal;
    const oldSeasonDue = summary.remainingTotal;
    tx.update(publicRef, { fineTotal, paidTotal, remainingTotal, fineCount: activeFines.filter((fine) => fine.finalAmount > 0).length });
    tx.update(summaryRef, {
      fineTotal: cents(summary.fineTotal - (removedFine?.finalAmount ?? 0)),
      paidTotal: cents(summary.paidTotal - (cancelPayment?.amount ?? 0)),
      remainingTotal: cents(oldSeasonDue - oldPlayerDue + remainingTotal),
      fineCount: Math.max(0, summary.fineCount - (removedFine && removedFine.finalAmount > 0 ? 1 : 0)), updatedAt: serverTimestamp(),
    });
    tx.set(log.ref, log.data);
  });
}

export function cancelPayment(payment: Payment) {
  return refreshPaymentLedger(payment.playerId, { cancelId: payment.id });
}

export function removeFine(fine: Fine) {
  if (fine.paidAmount > 0) return Promise.reject(new Error('Annulla prima il pagamento collegato, poi potrai annullare la multa.'));
  return refreshPaymentLedger(fine.playerId, { voidFineId: fine.id });
}

export async function exportJson(): Promise<void> {
  const db = requireDb();
  requireAuth();
  const [players, fines, payments] = await Promise.all([
    getDocs(collection(db, 'players')), getDocs(collection(db, 'fines')), getDocs(collection(db, 'payments')),
  ]);
  const payload = {
    season: '2026/27', exportedAt: new Date().toISOString(),
    players: players.docs.map((item) => ({ ...item.data(), id: item.id })),
    fines: fines.docs.map((item) => ({ ...item.data(), id: item.id })),
    payments: payments.docs.map((item) => ({ ...item.data(), id: item.id })),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'lecce-volley-26-27-backup.json'; anchor.click(); URL.revokeObjectURL(url);
}
