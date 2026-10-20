import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, type DocumentData, type Query, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Fine, Payment, Player, PublicPlayer, PublicSummary } from '../types';
import { userFacingError } from '../lib/utils';


function toList<T>(docs: QueryDocumentSnapshot<DocumentData>[]) {
  return docs.map((snapshot) => ({ ...snapshot.data(), id: snapshot.id }) as T);
}

function useCollection<T>(name: string, enabled = true, queryRef?: Query<DocumentData>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!db || !enabled) { setData([]); setLoading(false); return; }
    setLoading(true);
    return onSnapshot(queryRef ?? collection(db, name), (snapshot) => {
      setData(toList<T>(snapshot.docs)); setLoading(false); setError(null);
    }, (cause) => { setError(userFacingError(cause)); setLoading(false); });
  }, [name, enabled, queryRef]);
  return { data, loading, error };
}

export function usePlayers(enabled = true) { return useCollection<Player>('players', enabled); }
export function useFines(enabled = true) { return useCollection<Fine>('fines', enabled); }
export function usePayments(enabled = true) { return useCollection<Payment>('payments', enabled); }
export function usePublicPlayers() { return useCollection<PublicPlayer>('publicPlayers'); }

export function usePublicSummary() {
  const [data, setData] = useState<PublicSummary>({ fineTotal: 0, paidTotal: 0, remainingTotal: 0, fineCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!db) { setLoading(false); return; }
    return onSnapshot(doc(db, 'publicSummary', 'season'), (snapshot) => {
      if (snapshot.exists()) setData(snapshot.data() as PublicSummary);
      setLoading(false); setError(null);
    }, (cause) => { setLoading(false); setError(userFacingError(cause)); });
  }, []);
  return { data, loading, error };
}
