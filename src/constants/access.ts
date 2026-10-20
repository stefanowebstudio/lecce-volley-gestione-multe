/**
 * Entry point for the private administration area.
 *
 * This path only keeps the admin entry out of the public navigation. It is
 * not a security boundary: Firebase Authentication and Firestore rules are
 * what actually protect the data and writes.
 */
export const ADMIN_PATH = '/area-riservata-lv';
