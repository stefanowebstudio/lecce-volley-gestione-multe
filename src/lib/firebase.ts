import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const env = import.meta.env;
const required = [
  env.VITE_FIREBASE_API_KEY,
  env.VITE_FIREBASE_AUTH_DOMAIN,
  env.VITE_FIREBASE_PROJECT_ID,
  env.VITE_FIREBASE_APP_ID,
];

export const firebaseReady = required.every(Boolean);
const firebaseApp = firebaseReady
  ? (getApps().length ? getApp() : initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    }))
  : null;

export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;

const configuredAdmins = (env.VITE_ADMIN_UIDS ?? '').split(',').map((uid: string) => uid.trim()).filter(Boolean);
export function isConfiguredAdmin(uid: string | undefined): boolean {
  return !!uid && configuredAdmins.includes(uid);
}

export function requireDb() {
  if (!db) throw new Error('Firebase non è configurato. Completa .env.local e riavvia il server.');
  return db;
}

export function requireAuth() {
  if (!auth?.currentUser) throw new Error('Accedi con un account amministratore per continuare.');
  if (!isConfiguredAdmin(auth.currentUser.uid)) throw new Error('Questo account non è abilitato come amministratore.');
  return auth.currentUser;
}
