export type AppMode = 'public' | 'admin';

// The default build is the shareable, read-only site. The admin deployment
// opts in explicitly with VITE_APP_MODE=admin.
export const APP_MODE: AppMode = import.meta.env.VITE_APP_MODE === 'admin' ? 'admin' : 'public';
export const isAdminApp = APP_MODE === 'admin';
