import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { requireAuth, requireDb } from '../lib/firebase';
import type { Player } from '../types';
import { SEASON_ID } from '../constants/app';

function auditRef(action: string, targetId: string) {
  const db = requireDb();
  return { ref: doc(collection(db, 'auditLogs')), payload: { timestamp: serverTimestamp(), adminUid: requireAuth().uid, action, targetId } };
}

export async function savePlayer(input: { id?: string; name: string; surname: string; shirtNumber?: number; active?: boolean }) {
  const db = requireDb();
  requireAuth();
  const ref = input.id ? doc(db, 'players', input.id) : doc(collection(db, 'players'));
  const publicRef = doc(db, 'publicPlayers', ref.id);
  const audit = auditRef(input.id ? 'PLAYER_UPDATED' : 'PLAYER_CREATED', ref.id);
  const name = input.name.trim();
  const surname = input.surname.trim();
  if (!name || !surname) throw new Error('Inserisci nome e cognome.');
  if (input.shirtNumber !== undefined && (!Number.isInteger(input.shirtNumber) || input.shirtNumber < 0)) throw new Error('Il numero di maglia non è valido.');
  await runTransaction(db, async (tx) => {
    const [existing, oldPublicSnapshot] = await Promise.all([
      input.id ? tx.get(ref) : Promise.resolve(null),
      tx.get(publicRef),
    ]);
    if (input.id && !existing?.exists()) throw new Error('Giocatore non trovato.');
    const old = existing?.data();
    const player: Record<string, unknown> = {
      id: ref.id, name, surname, seasonId: SEASON_ID, active: input.active ?? old?.active ?? true,
      createdAt: old?.createdAt ?? serverTimestamp(),
    };
    if (input.shirtNumber !== undefined) player.shirtNumber = input.shirtNumber;
    tx.set(ref, player);
    const pub = oldPublicSnapshot.data() ?? {};
    const projection: Record<string, unknown> = {
      id: ref.id, name, surname, seasonId: SEASON_ID, active: player.active,
      fineTotal: pub.fineTotal ?? 0, paidTotal: pub.paidTotal ?? 0,
      remainingTotal: pub.remainingTotal ?? 0, fineCount: pub.fineCount ?? 0,
    };
    if (input.shirtNumber !== undefined) projection.shirtNumber = input.shirtNumber;
    else if (pub.shirtNumber !== undefined) projection.shirtNumber = pub.shirtNumber;
    tx.set(publicRef, projection);
    tx.set(audit.ref, audit.payload);
  });
  return ref.id;
}

export async function setPlayerActive(player: Pick<Player, 'id' | 'active'>, active: boolean) {
  const db = requireDb();
  requireAuth();
  const playerRef = doc(db, 'players', player.id);
  const publicRef = doc(db, 'publicPlayers', player.id);
  const audit = auditRef(active ? 'PLAYER_REACTIVATED' : 'PLAYER_ARCHIVED', player.id);
  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(playerRef);
    const publicSnapshot = await tx.get(publicRef);
    if (!snapshot.exists()) throw new Error('Giocatore non trovato.');
    tx.update(playerRef, { active });
    if (publicSnapshot.exists()) tx.update(publicRef, { active });
    tx.set(audit.ref, audit.payload);
  });
}
