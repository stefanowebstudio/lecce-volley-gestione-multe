import type { Timestamp } from 'firebase/firestore';

export function euros(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value || 0);
}

export function asDate(value: Timestamp | Date | undefined): Date {
  if (!value) return new Date();
  return value instanceof Date ? value : value.toDate();
}

export function dateLabel(value: Timestamp | Date | undefined, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }): string {
  return new Intl.DateTimeFormat('it-IT', options).format(asDate(value));
}

export function playerName(player: { name: string; surname: string }): string {
  return `${player.name} ${player.surname}`.trim();
}

export function userFacingError(cause: unknown, fallback = 'Operazione non riuscita.'): string {
  const error = cause as { code?: string; message?: string };
  if (error?.code === 'permission-denied') return 'Non hai i permessi per completare questa operazione.';
  if (error?.code === 'unavailable' || error?.code === 'deadline-exceeded' || error?.code === 'auth/network-request-failed' || /offline|network/i.test(error?.message ?? '')) {
    return 'Connessione a Firebase assente. Controlla internet e riprova.';
  }
  if (error?.code === 'unauthenticated' || error?.code === 'auth/requires-recent-login') return 'La sessione è scaduta. Accedi di nuovo.';
  if (error?.code === 'auth/too-many-requests') return 'Troppi tentativi di accesso. Attendi qualche minuto e riprova.';
  if (error?.code === 'auth/invalid-email') return 'L’indirizzo email non è valido.';
  if (error?.code === 'auth/user-disabled') return 'Questo account è stato disabilitato.';
  return error?.message || fallback;
}

export function csvDownload(filename: string, rows: Array<Record<string, string | number | boolean | undefined>>): void {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const body = [columns.map(quote).join(';'), ...rows.map((row) => columns.map((column) => quote(row[column])).join(';'))].join('\r\n');
  const blob = new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
