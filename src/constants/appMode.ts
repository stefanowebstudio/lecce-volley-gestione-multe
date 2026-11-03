export type AppMode = 'public' | 'admin' | 'invalid';

const rawAppMode = String(import.meta.env.VITE_APP_MODE ?? '').trim().toLowerCase();

// The deployment mode is a build-time decision. Never silently turn a bad or
// missing value into the public site: that makes an admin deployment look like
// the public one and hides a broken Vercel configuration.
export const APP_MODE: AppMode = rawAppMode === 'public' || rawAppMode === 'admin' ? rawAppMode : 'invalid';
export const isAdminApp = APP_MODE === 'admin';
export const isPublicApp = APP_MODE === 'public';
